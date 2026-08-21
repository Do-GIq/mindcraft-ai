import { Check, Copy, FilePenLine, LoaderCircle, Sparkles, Square } from 'lucide-react'
import { Profiler, useLayoutEffect, useState } from 'react'
import { MAX_AI_PROMPT_LENGTH, useAiGeneration } from '../hooks/useAiGeneration'
import type { GenerationStatus } from '../hooks/useAiGeneration'
import {
  recordFinalUiCommit,
  recordResultCommit,
  recordResultRender,
} from '../dev/streamBenchmark'

function AiResultContent({ output, status }: { output: string; status: GenerationStatus }) {
  recordResultRender()

  useLayoutEffect(() => {
    if (status === 'completed') recordFinalUiCommit()
  }, [output, status])

  return (
    <div className={`ai-output-content${output ? ' has-content' : ''}`}>
      {output ? output : status === 'generating' ? (
        <div className="ai-stream-starting"><LoaderCircle className="spin-icon" size={22} />正在准备生成内容...</div>
      ) : (
        <div className="ai-empty-state">
          <span><FilePenLine size={27} /></span>
          <h3>开始一次内容创作</h3>
          <p>描述你想创作的内容，AI 将在这里实时生成结果。</p>
        </div>
      )}
    </div>
  )
}

export default function AiCreatePage() {
  const [prompt, setPrompt] = useState('')
  const generation = useAiGeneration()

  async function startGeneration() {
    const submittedPrompt = prompt.trim()
    if (!submittedPrompt || submittedPrompt.length > MAX_AI_PROMPT_LENGTH || generation.isGenerating) {
      return
    }

    setPrompt('')
    await generation.start(submittedPrompt)
  }

  function stopGeneration() {
    generation.stop()
  }

  const isPromptInvalid = !prompt.trim() || prompt.trim().length > MAX_AI_PROMPT_LENGTH

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
            maxLength={MAX_AI_PROMPT_LENGTH + 1}
            disabled={generation.isGenerating}
          />
          <div className="ai-prompt-footer">
            <span className={prompt.length > MAX_AI_PROMPT_LENGTH ? 'is-over-limit' : ''}>{prompt.length} / {MAX_AI_PROMPT_LENGTH}</span>
            <div className="ai-generation-actions">
              {generation.isGenerating && <button className="secondary-button" type="button" onClick={stopGeneration}><Square size={15} fill="currentColor" />停止生成</button>}
              <button className="primary-button" type="button" onClick={startGeneration} disabled={generation.isGenerating || isPromptInvalid}>
                {generation.isGenerating ? <><LoaderCircle className="spin-icon" size={18} />生成中...</> : <><Sparkles size={18} />开始生成</>}
              </button>
            </div>
          </div>
        </section>

        <section className="ai-output-card" aria-live="polite">
          <div className="ai-output-heading">
            <div><h2>生成结果</h2><p>内容将在生成过程中实时显示。</p></div>
            <div className="ai-output-actions">
              {generation.output && (
                <button className="ai-copy-button" type="button" onClick={generation.copy}>
                  {generation.isCopied ? <Check size={15} /> : <Copy size={15} />}
                  {generation.isCopied ? '已复制' : '复制'}
                </button>
              )}
              <span className={`generation-status is-${generation.status}`}>
                {generation.status === 'generating' ? '正在生成' : generation.status === 'completed' ? '生成完成' : generation.status === 'error' ? '生成失败' : '等待生成'}
              </span>
            </div>
          </div>
          <Profiler id="ai-result" onRender={recordResultCommit}>
            <AiResultContent output={generation.output} status={generation.status} />
          </Profiler>
          {generation.errorMessage && <p className="ai-error-message" role="alert">{generation.errorMessage}</p>}
        </section>
      </div>
    </div>
  )
}
