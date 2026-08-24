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
    config?: {
      params?: {
        vectors?: { size?: unknown; distance?: unknown }
      }
    }
  }
}

type QueryResponse = {
  result?: { points?: Array<{ payload?: Record<string, unknown> }> }
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

export async function ensureKnowledgeCollection() {
  if (collectionPromise) return collectionPromise

  collectionPromise = (async () => {
    const { url, apiKey } = getQdrantConfig()
    const headers = qdrantHeaders(apiKey)
    const current = await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}`, { headers })
    if (current.ok) return 'existing' as const
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
    return created.status === 409 ? 'existing' as const : 'created' as const
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
  if (!exists) return { connected: true, exists: false, vectorSize: null, distance: null }

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
  if (vectorIds.length === 0) return
  const { url, apiKey } = getQdrantConfig()
  await fetch(`${url}/collections/${KNOWLEDGE_COLLECTION_NAME}/points/delete?wait=true`, {
    method: 'POST',
    headers: qdrantHeaders(apiKey),
    body: JSON.stringify({ points: vectorIds }),
  })
}

export async function queryKnowledgePoints(projectId: number, vector: number[], limit: number) {
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
  if (!response.ok) throw new Error(`Qdrant query failed (${response.status})`)
  const body = await response.json() as QueryResponse
  return body.result?.points ?? []
}
