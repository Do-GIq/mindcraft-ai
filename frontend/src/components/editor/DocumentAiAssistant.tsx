import type { Editor } from '@tiptap/core'
import { Check, Copy, LoaderCircle, Plus, Sparkles, Square } from 'lucide-react'
import { useState } from 'react'
import { recordDocumentAiPanelRender } from '../../dev/streamBenchmark'
import { MAX_AI_PROMPT_LENGTH, useAiGeneration } from '../../hooks/useAiGeneration'
import { markdownToTiptapHtml } from '../../lib/markdown'

type DocumentAiAssistantProps = {
  documentId: number
  editor: Editor | null
}

export default function DocumentAiAssistant({ documentId, editor }: DocumentAiAssistantProps) {
  recordDocumentAiPanelRender()

  const [prompt, setPrompt] = useState('')
  const [insertError, setInsertError] = useState('')
  const generation = useAiGeneration()

  function startGeneration() {
    const submittedPrompt = prompt.trim()
    if (!submittedPrompt || submittedPrompt.length > MAX_AI_PROMPT_LENGTH || generation.isGenerating) return

    setPrompt('')
    setInsertError('')
    void generation.start(submittedPrompt, documentId)
  }

  function insertResult() {
    if (!editor || !generation.output) return

    try {
      const html = markdownToTiptapHtml(generation.output)
      if (!html.trim()) return
      editor.chain().focus('end').insertContent(html).run()
      setInsertError('')
    } catch {
      setInsertError('插入失败，请稍后重试')
    }
  }

  return (
    <section className="document-ai-panel" aria-label="AI 辅助创作">
      <div className="document-ai-heading">
        <div className="document-ai-title">
          <span><Sparkles size={19} /></span>
          <div><h2>AI 辅助创作</h2><p>描述需要补充的内容，生成后可插入当前文档末尾。</p></div>
        </div>
        <span className={`generation-status is-${generation.status}`}>
          {generation.status === 'generating' ? '正在生成' : generation.status === 'completed' ? '生成完成' : generation.status === 'error' ? '生成失败' : '等待生成'}
        </span>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：补充一段产品核心优势，使用三级标题和要点列表。"
        maxLength={MAX_AI_PROMPT_LENGTH + 1}
        disabled={generation.isGenerating}
      />
      <div className="document-ai-prompt-footer">
        <span className={prompt.length > MAX_AI_PROMPT_LENGTH ? 'is-over-limit' : ''}>{prompt.length} / {MAX_AI_PROMPT_LENGTH}</span>
        <div className="ai-generation-actions">
          {generation.isGenerating && <button className="secondary-button" type="button" onClick={generation.stop}><Square size={14} fill="currentColor" />停止生成</button>}
          <button className="primary-button" type="button" onClick={startGeneration} disabled={generation.isGenerating || !prompt.trim() || prompt.trim().length > MAX_AI_PROMPT_LENGTH}>
            {generation.isGenerating ? <><LoaderCircle className="spin-icon" size={17} />生成中...</> : <><Sparkles size={17} />开始生成</>}
          </button>
        </div>
      </div>

      <div className={`document-ai-result${generation.output ? ' has-content' : ''}`} aria-live="polite">
        {generation.output || (generation.isGenerating ? '正在准备生成内容...' : 'AI 生成结果将在这里实时显示。')}
      </div>

      {(generation.output || generation.errorMessage || insertError) && (
        <div className="document-ai-result-footer">
          <div>
            {generation.errorMessage && <p className="ai-error-message" role="alert">{generation.errorMessage}</p>}
            {insertError && <p className="ai-error-message" role="alert">{insertError}</p>}
          </div>
          {generation.output && (
            <div className="document-ai-result-actions">
              <button className="secondary-button" type="button" onClick={generation.copy}>
                {generation.isCopied ? <Check size={16} /> : <Copy size={16} />}{generation.isCopied ? '已复制' : '复制'}
              </button>
              <button className="primary-button" type="button" onClick={insertResult} disabled={!editor}>
                <Plus size={17} />插入到文档
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
