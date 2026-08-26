import type { Editor } from '@tiptap/core'
import { useState } from 'react'
import { markdownToTiptapHtml } from '../../lib/markdown'
import ScopedConversationChat from '../ai/ScopedConversationChat'

type DocumentAiAssistantProps = {
  projectId: number
  documentId: number
  editor: Editor | null
}

export default function DocumentAiAssistant({ projectId, documentId, editor }: DocumentAiAssistantProps) {
  const [insertError, setInsertError] = useState('')

  function insertResult(content: string) {
    if (!editor || !content) return

    try {
      const html = markdownToTiptapHtml(content)
      if (!html.trim()) return
      editor.chain().focus('end').insertContent(html).run()
      setInsertError('')
    } catch {
      setInsertError('插入失败，请稍后重试')
    }
  }

  return (
    <aside className="document-ai-sidecar" aria-label="文档 AI 助手">
      <ScopedConversationChat key={`document-chat-${documentId}`} projectId={projectId} documentId={documentId} compact onInsert={insertResult} />
      {insertError && <p className="document-ai-insert-error" role="alert">{insertError}</p>}
    </aside>
  )
}
