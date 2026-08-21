import type { Request, Response } from 'express'
import { performance } from 'node:perf_hooks'
import { captureRequestException } from '../../lib/sentry.js'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { getOwnedDocument } from '../document/document.service.js'
import {
  appendAssistantMessage,
  appendUserMessageAndGetContext,
} from '../conversation/conversation.service.js'
import {
  AiConfigurationError,
  AiProviderError,
  createAiTextStream,
  getAiLogMetadata,
  saveAiGenerationMetric,
} from './ai.service.js'

type GenerateBody = { prompt?: unknown; documentId?: unknown; conversationId?: unknown }

const MAX_PROMPT_LENGTH = 8_000

function writeEvent(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function countTextCharacters(value: string) {
  return Array.from(value).length
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


  const userId = getAuthenticatedUserId(req)
  let documentId: number | null = null
  let conversationId: number | null = null
  let modelInput: Parameters<typeof createAiTextStream>[0] = prompt

  if (req.body?.conversationId !== undefined) {
    const parsedConversationId = Number(req.body.conversationId)
    if (!Number.isInteger(parsedConversationId) || parsedConversationId <= 0) {
      res.status(400).json({ message: 'Invalid conversation id' })
      return
    }

    try {
      const context = await appendUserMessageAndGetContext(userId, parsedConversationId, prompt)
      if (!context) {
        res.status(404).json({ message: 'Conversation not found' })
        return
      }
      conversationId = parsedConversationId
      documentId = context.conversation.documentId
      modelInput = context.messages
    } catch (error) {
      req.logger.error({ err: error, conversationId: parsedConversationId }, 'failed to prepare conversation context')
      captureRequestException(req, error, { conversationId: parsedConversationId })
      res.status(500).json({ message: 'Failed to prepare conversation' })
      return
    }
  } else if (req.body?.documentId !== undefined) {
    const parsedDocumentId = Number(req.body.documentId)
    if (!Number.isInteger(parsedDocumentId) || parsedDocumentId <= 0) {
      res.status(400).json({ message: 'Invalid document id' })
      return
    }
    const document = await getOwnedDocument(userId, parsedDocumentId)
    if (!document) {
      res.status(404).json({ message: 'Document not found' })
      return
    }
    documentId = document.id
  }

  const abortController = new AbortController()
  const startedAt = performance.now()
  const aiMetadata = getAiLogMetadata()
  const logContext = {
    ...aiMetadata,
    promptLength: prompt.length,
  }
  let streamStarted = false
  let streamFinished = false
  let outputChars = 0
  let firstTokenMs: number | null = null
  let metricRecorded = false
  const assistantChunks: string[] = []

  const recordMetric = async (status: 'SUCCESS' | 'FAILED' | 'ABORTED') => {
    if (metricRecorded) return
    metricRecorded = true
    try {
      await saveAiGenerationMetric({
        userId,
        documentId,
        provider: aiMetadata.provider,
        model: aiMetadata.model,
        status,
        inputChars: countTextCharacters(prompt),
        outputChars,
        firstTokenMs,
        durationMs: Math.round(performance.now() - startedAt),
      })
    } catch (metricError) {
      req.logger.error(
        { err: metricError, userId, documentId, status },
        'failed to persist AI generation metric',
      )
    }
  }

  const abortUpstream = () => {
    if (!streamFinished) {
      abortController.abort()
    }
  }

  req.once('aborted', abortUpstream)
  res.once('close', abortUpstream)

  try {
    const chunks = await createAiTextStream(modelInput, abortController.signal)

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
      if (firstTokenMs === null) firstTokenMs = Math.round(performance.now() - startedAt)
      outputChars += countTextCharacters(text)
      if (conversationId !== null) assistantChunks.push(text)
      writeEvent(res, 'delta', { text })
    }

    if (!abortController.signal.aborted && !res.destroyed) {
      if (conversationId !== null) {
        const saved = await appendAssistantMessage(userId, conversationId, assistantChunks.join(''))
        if (!saved) throw new Error('Conversation disappeared before assistant message was saved')
      }
      writeEvent(res, 'done', {})
      streamFinished = true
      res.end()
      void recordMetric('SUCCESS')
      req.logger.info(
        { ...logContext, durationMs: Number((performance.now() - startedAt).toFixed(2)) },
        'AI generation completed',
      )
    } else {
      void recordMetric('ABORTED')
    }
  } catch (error) {
    if (isAbortError(error) || abortController.signal.aborted) {
      void recordMetric('ABORTED')
      req.logger.info(
        { ...logContext, durationMs: Number((performance.now() - startedAt).toFixed(2)) },
        'AI generation aborted',
      )
      return
    }

    const errorContext = {
      ...logContext,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      errorType: error instanceof Error ? error.name : 'UnknownError',
      err: error,
    }
    const sentryContext = {
      ...logContext,
      durationMs: errorContext.durationMs,
      errorType: errorContext.errorType,
    }

    void recordMetric('FAILED')

    if (!streamStarted) {
      if (error instanceof AiConfigurationError) {
        req.logger.error(errorContext, 'AI generation configuration is missing')
        captureRequestException(req, error, sentryContext)
        res.status(500).json({ message: 'AI service is not configured' })
        return
      }

      if (error instanceof AiProviderError) {
        req.logger.error({ ...errorContext, providerStatus: error.status }, 'AI provider request failed')
        captureRequestException(req, error, { ...sentryContext, providerStatus: error.status })
        res.status(502).json({ message: 'AI generation failed' })
        return
      }

      req.logger.error(errorContext, 'AI generation failed before streaming')
      captureRequestException(req, error, sentryContext)
      res.status(500).json({ message: 'AI generation failed' })
      return
    }

    req.logger.error(errorContext, 'AI generation stream failed')
    captureRequestException(req, error, sentryContext)
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
