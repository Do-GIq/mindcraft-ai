type ProviderChunk = {
  choices?: Array<{
    delta?: {
      content?: unknown
    }
  }>
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiConfigurationError'
  }
}

export class AiProviderError extends Error {
  constructor(public readonly status: number) {
    super('AI provider request failed')
    this.name = 'AiProviderError'
  }
}

function getAiConfig() {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL

  if (!apiKey || !baseUrl || !model) {
    throw new AiConfigurationError('AI provider is not configured')
  }

  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ''), model }
}

function getCompletionUrl(baseUrl: string) {
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`
}

export function getAiLogMetadata() {
  const baseUrl = process.env.AI_BASE_URL
  let provider = 'unconfigured'

  if (baseUrl) {
    try {
      provider = new URL(baseUrl).hostname
    } catch {
      provider = 'invalid-base-url'
    }
  }

  return {
    provider,
    model: process.env.AI_MODEL ?? 'unconfigured',
  }
}

export function saveAiGenerationMetric(input: {
  userId: number
  documentId: number | null
  provider: string
  model: string
  status: AiGenerationStatus
  inputChars: number
  outputChars: number
  firstTokenMs: number | null
  durationMs: number
}) {
  return prisma.aiGeneration.create({ data: input })
}

function extractText(data: unknown) {
  if (!data || typeof data !== 'object') {
    return ''
  }

  const chunk = data as ProviderChunk
  const content = chunk.choices?.[0]?.delta?.content
  return typeof content === 'string' ? content : ''
}

async function* parseProviderStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      let boundary = buffer.match(/\r?\n\r?\n/)
      while (boundary?.index !== undefined) {
        const message = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)

        const data = message
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n')

        if (data === '[DONE]') {
          return
        }

        if (data) {
          try {
            const text = extractText(JSON.parse(data) as unknown)
            if (text) {
              yield text
            }
          } catch {
            // Ignore malformed non-content provider events and continue the stream.
          }
        }

        boundary = buffer.match(/\r?\n\r?\n/)
      }

      if (done) {
        return
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function createAiTextStream(prompt: string, signal: AbortSignal) {
  const { apiKey, baseUrl, model } = getAiConfig()
  const response = await fetch(getCompletionUrl(baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  })

  if (!response.ok) {
    throw new AiProviderError(response.status)
  }

  if (!response.body) {
    throw new AiProviderError(502)
  }

  return parseProviderStream(response.body)
}
import type { AiGenerationStatus } from '../../generated/prisma/enums.js'
import { prisma } from '../../db/prisma.js'
