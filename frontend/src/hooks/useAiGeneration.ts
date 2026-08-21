import { useCallback, useEffect, useRef, useState } from 'react'
import { AiStreamError, generateAiContent } from '../api/aiApi'
import {
  recordStreamDelta,
  recordStreamStateUpdate,
  resetStreamBenchmark,
} from '../dev/streamBenchmark'

export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

export const MAX_AI_PROMPT_LENGTH = 8_000

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export function useAiGeneration() {
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingOutputRef = useRef('')
  const animationFrameRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  const flushPendingOutput = useCallback(() => {
    animationFrameRef.current = null
    const pendingOutput = pendingOutputRef.current
    if (!pendingOutput || !isMountedRef.current) return

    pendingOutputRef.current = ''
    recordStreamStateUpdate()
    setOutput((current) => current + pendingOutput)
  }, [])

  const flushPendingOutputNow = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    flushPendingOutput()
  }, [flushPendingOutput])

  const enqueueOutput = useCallback((text: string) => {
    pendingOutputRef.current += text
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(flushPendingOutput)
    }
  }, [flushPendingOutput])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      pendingOutputRef.current = ''
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current)
    }
  }, [])

  const start = useCallback(async (prompt: string, documentId?: number, conversationId?: number) => {
    const submittedPrompt = prompt.trim()
    if (!submittedPrompt || submittedPrompt.length > MAX_AI_PROMPT_LENGTH || abortControllerRef.current) {
      return
    }

    const abortController = new AbortController()
    resetStreamBenchmark()
    pendingOutputRef.current = ''
    abortControllerRef.current = abortController
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
    setOutput('')
    setIsCopied(false)
    setErrorMessage('')
    setStatus('generating')

    try {
      await generateAiContent(submittedPrompt, {
        signal: abortController.signal,
        onDelta: (text) => {
          if (abortControllerRef.current === abortController) {
            recordStreamDelta(text)
            enqueueOutput(text)
          }
        },
      }, documentId, conversationId)
      if (abortControllerRef.current === abortController) {
        flushPendingOutputNow()
        setStatus('completed')
      }
    } catch (error) {
      if (abortControllerRef.current !== abortController) return
      flushPendingOutputNow()
      if (isAbortError(error)) {
        setStatus('idle')
      } else {
        setErrorMessage(error instanceof AiStreamError ? error.message : '请求失败，请稍后重试')
        setStatus('error')
      }
    } finally {
      if (abortControllerRef.current === abortController) abortControllerRef.current = null
    }
  }, [enqueueOutput, flushPendingOutputNow])

  const stop = useCallback(() => abortControllerRef.current?.abort(), [])

  const copy = useCallback(async () => {
    if (!output) return

    try {
      await navigator.clipboard.writeText(output)
      setIsCopied(true)
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = setTimeout(() => {
        setIsCopied(false)
        copyFeedbackTimerRef.current = null
      }, 1_800)
    } catch {
      setIsCopied(false)
    }
  }, [output])

  return {
    output,
    status,
    errorMessage,
    isCopied,
    isGenerating: status === 'generating',
    start,
    stop,
    copy,
  }
}
