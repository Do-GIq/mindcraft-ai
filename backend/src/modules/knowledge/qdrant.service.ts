const KNOWLEDGE_COLLECTION_NAME = 'mindcraft_knowledge'
const KNOWLEDGE_VECTOR_SIZE = 1_024
const KNOWLEDGE_DISTANCE = 'Cosine'

export type KnowledgeVectorPoint = {
  id: string
  vector: number[]
  payload: { projectId: number; knowledgeFileId: number; chunkId: number }
}

type CollectionsResponse = {
  result?: { collections?: Array<{ name?: unknown }> }
}

type CollectionResponse = {
  result?: {
    payload_schema?: Record<string, { data_type?: unknown }>
    config?: {
      params?: {
        vectors?: { size?: unknown; distance?: unknown }
      }
    }
  }
}

export type KnowledgeQueryPoint = {
  payload: Record<string, unknown>
  score: number | null
}

type QueryResponse = {
  result?: { points?: Array<{ payload?: Record<string, unknown>; score?: unknown }> }
}

type QdrantErrorResponse = {
  status?: { error?: unknown }
}

let collectionPromise: Promise<'created' | 'existing'> | null = null

function getQdrantConfig() {
  const url = process.env.QDRANT_URL?.replace(/\/+$/, '')
  if (!url) throw new Error('Qdrant is not configured')
  return { url, apiKey: process.env.QDRANT_API_KEY }
}

function qdrantHeaders(apiKey?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (apiKey) headers.set('api-key', apiKey)
  return headers
}

async function getQdrantErrorMessage(response: Response) {
  try {
    const body = await response.json() as QdrantErrorResponse
    const message = body.status?.error
    if (typeof message === 'string' && message.trim()) return message.trim().slice(0, 1_000)
  } catch {
    // Qdrant may return an empty or non-JSON error response.
  }
  return 'No error details returned by Qdrant'
}

async function validateKnowledgeCollection(response: Response) {
  const collection = await response.json() as CollectionResponse
  const vectors = collection.result?.config?.params?.vectors
  const vectorSize = typeof vectors?.size === 'number' ? vectors.size : null
  const distance = typeof vectors?.distance === 'string' ? vectors.distance : null
  if (vectorSize !== KNOWLEDGE_VECTOR_SIZE || distance?.toLowerCase() !== KNOWLEDGE_DISTANCE.toLowerCase()) {
    throw new Error(
      `Qdrant collection configuration mismatch (expected ${KNOWLEDGE_VECTOR_SIZE}/${KNOWLEDGE_DISTANCE}, received ${vectorSize ?? 'unknown'}/${distance ?? 'unknown'})`,
    )
  }
}

async function ensureProjectIdPayloadIndex(url: string, headers: Headers) {
  const response = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}/index?wait=true`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ field_name: 'projectId', field_schema: 'integer' }),
  })
  if (!response.ok) {
    const detail = await getQdrantErrorMessage(response)
    throw new Error(
      `Qdrant payload index initialization failed (${response.status}): ${detail} (collection=${KNOWLEDGE_COLLECTION_NAME}, field=projectId, type=integer)`,
    )
  }
}

export async function ensureKnowledgeCollection() {
  if (collectionPromise) return collectionPromise

  collectionPromise = (async () => {
    const { url, apiKey } = getQdrantConfig()
    const headers = qdrantHeaders(apiKey)
    const current = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}`, { headers })
    if (current.ok) {
      await validateKnowledgeCollection(current)
      await ensureProjectIdPayloadIndex(url, headers)
      return 'existing' as const
    }
    if (current.status !== 404) throw new Error(`Qdrant collection check failed (${current.status})`)

    const created = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        vectors: { size: KNOWLEDGE_VECTOR_SIZE, distance: KNOWLEDGE_DISTANCE },
      }),
    })
    if (!created.ok && created.status !== 409) {
      throw new Error(`Qdrant collection creation failed (${created.status})`)
    }
    if (created.status === 409) {
      const existing = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}`, { headers })
      if (!existing.ok) throw new Error(`Qdrant collection check failed (${existing.status})`)
      await validateKnowledgeCollection(existing)
      await ensureProjectIdPayloadIndex(url, headers)
      return 'existing' as const
    }
    await ensureProjectIdPayloadIndex(url, headers)
    return 'created' as const
  })().catch((error) => {
    collectionPromise = null
    throw error
  })

  return collectionPromise
}

export async function getKnowledgeCollectionStatus() {
  const { url, apiKey } = getQdrantConfig()
  const headers = qdrantHeaders(apiKey)
  const collectionsResponse = await fetch(`${url}/collections`, { headers })
  if (!collectionsResponse.ok) {
    throw new Error(`Qdrant getCollections failed (${collectionsResponse.status})`)
  }

  const collections = await collectionsResponse.json() as CollectionsResponse
  const exists = (collections.result?.collections ?? [])
    .some((collection) => collection.name === KNOWLEDGE_COLLECTION_NAME)
  if (!exists) {
    return {
      connected: true,
      exists: false,
      vectorSize: null,
      distance: null,
      projectIdIndexType: null,
    }
  }

  const collectionResponse = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}`, { headers })
  if (!collectionResponse.ok) {
    throw new Error(`Qdrant collection detail failed (${collectionResponse.status})`)
  }
  const collection = await collectionResponse.json() as CollectionResponse
  const vectors = collection.result?.config?.params?.vectors
  return {
    connected: true,
    exists: true,
    vectorSize: typeof vectors?.size === 'number' ? vectors.size : null,
    distance: typeof vectors?.distance === 'string' ? vectors.distance : null,
    projectIdIndexType: typeof collection.result?.payload_schema?.projectId?.data_type === 'string'
      ? collection.result.payload_schema.projectId.data_type
      : null,
  }
}

export async function upsertKnowledgePoints(points: KnowledgeVectorPoint[]) {
  if (points.length === 0) return
  await ensureKnowledgeCollection()
  const { url, apiKey } = getQdrantConfig()
  const response = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}/points?wait=true`, {
    method: 'PUT',
    headers: qdrantHeaders(apiKey),
    body: JSON.stringify({ points }),
  })
  if (!response.ok) throw new Error(`Qdrant upsert failed (${response.status})`)
}

export async function deleteKnowledgePoints(vectorIds: string[]) {
  const validVectorIds = vectorIds.filter((vectorId) => vectorId.trim().length > 0)
  if (validVectorIds.length === 0) return
  const { url, apiKey } = getQdrantConfig()
  const response = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}/points/delete?wait=true`, {
    method: 'POST',
    headers: qdrantHeaders(apiKey),
    body: JSON.stringify({ points: validVectorIds }),
  })
  if (!response.ok) throw new Error(`Qdrant point deletion failed (${response.status})`)
}

export async function queryKnowledgePoints(projectId: number, vector: number[], limit: number) {
  if (vector.length !== KNOWLEDGE_VECTOR_SIZE) {
    throw new Error(
      `Qdrant query vector dimension mismatch (expected ${KNOWLEDGE_VECTOR_SIZE}, received ${vector.length}; collection=${KNOWLEDGE_COLLECTION_NAME}, projectId=${projectId}, limit=${limit})`,
    )
  }
  await ensureKnowledgeCollection()
  const { url, apiKey } = getQdrantConfig()
  const response = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}/points/query`, {
    method: 'POST',
    headers: qdrantHeaders(apiKey),
    body: JSON.stringify({
      query: vector,
      filter: { must: [{ key: 'projectId', match: { value: projectId } }] },
      limit,
      with_payload: true,
    }),
  })
  if (!response.ok) {
    const detail = await getQdrantErrorMessage(response)
    throw new Error(
      `Qdrant query failed (${response.status}): ${detail} (collection=${KNOWLEDGE_COLLECTION_NAME}, vectorDimension=${vector.length}, projectId=${projectId}, limit=${limit})`,
    )
  }
  const body = await response.json() as QueryResponse
  return (body.result?.points ?? []).map((point) => ({
    payload: point.payload ?? {},
    score: typeof point.score === 'number' && Number.isFinite(point.score) ? point.score : null,
  }))
}
