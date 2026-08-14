import { authenticatedFetch } from './authenticatedFetch'

type StreamCallbacks = {
  signal: AbortSignal
  onDelta: (text: string) => void
}

type ErrorPayload = { message?: unknown }

export class AiStreamError extends Error {}

function getMessageBoundary(buffer: string) {
  const match = buffer.match(/\r?\n\r?\n/)
  return match?.index === undefined ? null : { index: match.index, length: match[0].length }
}

function parseEvent(message: string) {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of message.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  const data = dataLines.join('\n')
  if (!data) {
    return null
  }

  try {
    return { event, data: JSON.parse(data) as unknown }
  } catch {
    throw new AiStreamError('AI 返回了无法解析的数据')
  }
}

function getObjectValue(data: unknown, key: string) {
  return data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : undefined
}

async function getResponseError(response: Response) {
  try {
    const payload = await response.json() as ErrorPayload
    return typeof payload.message === 'string' ? payload.message : 'AI 生成失败'
  } catch {
    return 'AI 生成失败'
  }
}

export async function generateAiContent(prompt: string, { signal, onDelta }: StreamCallbacks) {
  const response = await authenticatedFetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  })

  if (!response.ok) {
    throw new AiStreamError(await getResponseError(response))
  }

  if (!response.body) {
    throw new AiStreamError('浏览器无法读取 AI 流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false

  try {
    while (!completed) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      let boundary = getMessageBoundary(buffer)
      while (boundary) {
        const rawEvent = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary.length)
        const parsed = parseEvent(rawEvent)

        if (parsed?.event === 'delta') {
          const text = getObjectValue(parsed.data, 'text')
          if (typeof text === 'string') {
            onDelta(text)
          }
        } else if (parsed?.event === 'done') {
          completed = true
          break
        } else if (parsed?.event === 'error') {
          const message = getObjectValue(parsed.data, 'message')
          throw new AiStreamError(typeof message === 'string' ? message : 'AI 生成失败')
        }

        boundary = getMessageBoundary(buffer)
      }

      if (done) {
        if (!completed) {
          throw new AiStreamError('AI 流式响应意外中断')
        }
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
}
