import { AiConfigurationError, AiProviderError } from '../ai/ai.service.js'

type EmbeddingResponse = {
  data?: Array<{ embedding?: unknown }>
}

function getEmbeddingConfig() {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_EMBEDDING_MODEL

  if (!apiKey || !baseUrl || !model) {
    throw new AiConfigurationError('Embedding provider is not configured')
  }

  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ''), model }
}

function getEmbeddingUrl(baseUrl: string) {
  if (baseUrl.endsWith('/chat/completions')) {
    return `${baseUrl.slice(0, -'/chat/completions'.length)}/embeddings`
  }
  return baseUrl.endsWith('/embeddings') ? baseUrl : `${baseUrl}/embeddings`
}

export async function createEmbedding(input: string, signal?: AbortSignal) {
  const { apiKey, baseUrl, model } = getEmbeddingConfig()
  const response = await fetch(getEmbeddingUrl(baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input }),
    ...(signal ? { signal } : {}),
  })

  if (!response.ok) throw new AiProviderError(response.status)

  const body = await response.json() as EmbeddingResponse
  const embedding = body.data?.[0]?.embedding
  if (!Array.isArray(embedding) || embedding.length === 0 || !embedding.every(Number.isFinite)) {
    throw new AiProviderError(502)
  }

  return embedding as number[]
}
