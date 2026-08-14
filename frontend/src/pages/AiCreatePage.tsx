import { Check, Copy, FilePenLine, LoaderCircle, Sparkles, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AiStreamError, generateAiContent } from '../api/aiApi'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error'

const MAX_PROMPT_LENGTH = 8_000

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export default function AiCreatePage() {
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    abortControllerRef.current?.abort()
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current)
    }
  }, [])

  async function startGeneration() {
    const submittedPrompt = prompt.trim()
    if (!submittedPrompt || submittedPrompt.length > MAX_PROMPT_LENGTH || status === 'generating') {
      return
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
    setPrompt('')
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
      })
      if (abortControllerRef.current === abortController) {
        setStatus('completed')
      }
    } catch (error) {
      if (abortControllerRef.current !== abortController) {
        return
      }

      if (isAbortError(error)) {
        setStatus('idle')
      } else {
        setErrorMessage(error instanceof AiStreamError ? error.message : '请求失败，请稍后重试')
        setStatus('error')
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  function stopGeneration() {
    abortControllerRef.current?.abort()
  }

  async function copyOutput() {
    if (!output) {
      return
    }

    try {
      await navigator.clipboard.writeText(output)
      setIsCopied(true)
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current)
      }
      copyFeedbackTimerRef.current = setTimeout(() => {
        setIsCopied(false)
        copyFeedbackTimerRef.current = null
      }, 1_800)
    } catch {
      setIsCopied(false)
    }
  }

  const isGenerating = status === 'generating'
  const isPromptInvalid = !prompt.trim() || prompt.trim().length > MAX_PROMPT_LENGTH

  return (
    <div className="ai-create-page">
      <header className="ai-page-header">
        <div className="ai-page-icon"><Sparkles size={24} /></div>
        <div>
          <h1>AI 创作</h1>
          <p>描述创作需求，让 AI 为你实时生成清晰、可继续编辑的内容。</p>
        </div>
      </header>

      <div className="ai-workspace">
        <section className="ai-prompt-card">
          <div className="ai-section-heading">
            <div><h2>创作需求</h2><p>请尽量说明主题、语气、受众和期望结构。</p></div>
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例如：写一篇适合小红书发布的杭州周末旅行攻略，语气轻松，包含两日行程和美食推荐。"
            maxLength={MAX_PROMPT_LENGTH + 1}
            disabled={isGenerating}
          />
          <div className="ai-prompt-footer">
            <span className={prompt.length > MAX_PROMPT_LENGTH ? 'is-over-limit' : ''}>{prompt.length} / {MAX_PROMPT_LENGTH}</span>
            <div className="ai-generation-actions">
              {isGenerating && <button className="secondary-button" type="button" onClick={stopGeneration}><Square size={15} fill="currentColor" />停止生成</button>}
              <button className="primary-button" type="button" onClick={startGeneration} disabled={isGenerating || isPromptInvalid}>
                {isGenerating ? <><LoaderCircle className="spin-icon" size={18} />生成中...</> : <><Sparkles size={18} />开始生成</>}
              </button>
            </div>
          </div>
        </section>

        <section className="ai-output-card" aria-live="polite">
          <div className="ai-output-heading">
            <div><h2>生成结果</h2><p>内容将在生成过程中实时显示。</p></div>
            <div className="ai-output-actions">
              {output && (
                <button className="ai-copy-button" type="button" onClick={copyOutput}>
                  {isCopied ? <Check size={15} /> : <Copy size={15} />}
                  {isCopied ? '已复制' : '复制'}
                </button>
              )}
              <span className={`generation-status is-${status}`}>
                {status === 'generating' ? '正在生成' : status === 'completed' ? '生成完成' : status === 'error' ? '生成失败' : '等待生成'}
              </span>
            </div>
          </div>
          <div className={`ai-output-content${output ? ' has-content' : ''}`}>
            {output ? output : isGenerating ? (
              <div className="ai-stream-starting"><LoaderCircle className="spin-icon" size={22} />正在准备生成内容...</div>
            ) : (
              <div className="ai-empty-state">
                <span><FilePenLine size={27} /></span>
                <h3>开始一次内容创作</h3>
                <p>描述你想创作的内容，AI 将在这里实时生成结果。</p>
              </div>
            )}
          </div>
          {errorMessage && <p className="ai-error-message" role="alert">{errorMessage}</p>}
        </section>
      </div>
    </div>
  )
}
