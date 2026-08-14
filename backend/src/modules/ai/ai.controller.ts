import type { Request, Response } from 'express'
import { AiConfigurationError, AiProviderError, createAiTextStream } from './ai.service.js'

type GenerateBody = { prompt?: unknown }

const MAX_PROMPT_LENGTH = 8_000

function writeEvent(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export async function generateController(
  req: Request<Record<string, never>, unknown, GenerateBody>,
  res: Response,
) {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''

  if (!prompt) {
    res.status(400).json({ message: 'Prompt is required' })
    return
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(400).json({ message: `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters` })
    return
  }

  const abortController = new AbortController()
  let streamStarted = false
  let streamFinished = false

  const abortUpstream = () => {
    if (!streamFinished) {
      abortController.abort()
    }
  }

  req.once('aborted', abortUpstream)
  res.once('close', abortUpstream)

  try {
    const chunks = await createAiTextStream(prompt, abortController.signal)

    res.status(200)
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()
    streamStarted = true

    for await (const text of chunks) {
      if (abortController.signal.aborted || res.destroyed) {
        break
      }
      writeEvent(res, 'delta', { text })
    }

    if (!abortController.signal.aborted && !res.destroyed) {
      writeEvent(res, 'done', {})
      streamFinished = true
      res.end()
    }
  } catch (error) {
    if (isAbortError(error) || abortController.signal.aborted) {
      return
    }

    if (!streamStarted) {
      if (error instanceof AiConfigurationError) {
        console.error('AI generation unavailable: AI environment variables are not configured')
        res.status(500).json({ message: 'AI service is not configured' })
        return
      }

      if (error instanceof AiProviderError) {
        console.error(`AI provider request failed with status ${error.status}`)
        res.status(502).json({ message: 'AI generation failed' })
        return
      }

      console.error('AI generation failed before streaming')
      res.status(500).json({ message: 'AI generation failed' })
      return
    }

    console.error('AI generation stream failed')
    if (!res.destroyed) {
      writeEvent(res, 'error', { message: 'AI 生成失败' })
      streamFinished = true
      res.end()
    }
  } finally {
    req.off('aborted', abortUpstream)
    res.off('close', abortUpstream)
  }
}
