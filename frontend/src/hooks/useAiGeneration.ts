import { useCallback, useEffect, useRef, useState } from 'react'
import { AiStreamError, generateAiContent } from '../api/aiApi'

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

  useEffect(() => () => {
    abortControllerRef.current?.abort()
    if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current)
  }, [])

  const start = useCallback(async (prompt: string, documentId?: number) => {
    const submittedPrompt = prompt.trim()
    if (!submittedPrompt || submittedPrompt.length > MAX_AI_PROMPT_LENGTH || abortControllerRef.current) {
      return
    }

    const abortController = new AbortController()
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
            setOutput((current) => current + text)
          }
        },
      }, documentId)
      if (abortControllerRef.current === abortController) setStatus('completed')
    } catch (error) {
      if (abortControllerRef.current !== abortController) return
      if (isAbortError(error)) {
        setStatus('idle')
      } else {
        setErrorMessage(error instanceof AiStreamError ? error.message : '请求失败，请稍后重试')
        setStatus('error')
      }
    } finally {
      if (abortControllerRef.current === abortController) abortControllerRef.current = null
    }
  }, [])

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
