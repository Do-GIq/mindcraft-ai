import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ArrowLeft, Bold, Heading1, Heading2, Italic, List, ListOrdered, Quote, Redo2, Save, Undo2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { DocumentApiError, documentQueryKey, documentsQueryKey, fetchDocument, updateDocument } from '../api/documentApi'
import { useAuthStore } from '../stores/authStore'

type SaveState = 'idle' | 'saved' | 'error'

function DocumentEditorPage() {
  const { projectId: projectIdParam, documentId: documentIdParam } = useParams()
  const projectId = Number(projectIdParam)
  const documentId = Number(documentIdParam)
  const isValidRoute = Number.isInteger(projectId) && projectId > 0 && Number.isInteger(documentId) && documentId > 0
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const initializedDocumentId = useRef<number | null>(null)
  const currentDocumentQueryKey = documentQueryKey(userId, documentId)
  const documentQuery = useQuery({
    queryKey: currentDocumentQueryKey,
    queryFn: () => fetchDocument(documentId),
    enabled: userId !== undefined && isValidRoute,
    retry: (failureCount, error) => !(error instanceof DocumentApiError && error.status === 404) && failureCount < 2,
  })
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    onUpdate: () => setSaveState('idle'),
  })
  const saveMutation = useMutation({
    mutationFn: (input: { title: string; content: string }) => updateDocument(documentId, input),
    onSuccess: (document) => {
      queryClient.setQueryData(currentDocumentQueryKey, document)
      void queryClient.invalidateQueries({ queryKey: documentsQueryKey(userId, document.projectId) })
      setTitle(document.title)
      setSaveState('saved')
    },
    onError: () => setSaveState('error'),
  })

  useEffect(() => {
    const document = documentQuery.data
    if (!document || !editor || initializedDocumentId.current === document.id) return

    setTitle(document.title)
    editor.commands.setContent(document.content, { emitUpdate: false })
    initializedDocumentId.current = document.id
    setSaveState('idle')
  }, [documentQuery.data, editor])

  function handleSave() {
    const trimmedTitle = title.trim()
    if (!editor || !trimmedTitle) {
      setSaveState('error')
      return
    }
    saveMutation.mutate({ title: trimmedTitle, content: editor.getHTML() })
  }

  const returnLink = `/projects/${documentQuery.data?.projectId ?? projectId}`

  if (!isValidRoute) {
    return <div className="editor-state is-error"><p>文档不存在或无权访问</p><Link to="/projects">返回我的项目</Link></div>
  }
  if (documentQuery.isPending) return <div className="editor-state">正在加载文档编辑器...</div>
  if (documentQuery.isError) {
    const isNotFound = documentQuery.error instanceof DocumentApiError && documentQuery.error.status === 404
    return <div className="editor-state is-error"><p>{isNotFound ? '文档不存在或无权访问' : '文档加载失败，请稍后重试'}</p><Link to={returnLink}>返回项目详情</Link></div>
  }

  return (
    <section className="document-editor-page">
      <header className="editor-header">
        <Link className="back-link" to={returnLink}><ArrowLeft size={17} />返回当前项目</Link>
        <div className="editor-title-row">
          <input className="document-title-input" value={title} onChange={(event) => { setTitle(event.target.value); setSaveState('idle') }} aria-label="文档标题" />
          <div className="save-area">
            {saveState === 'saved' && <span className="save-status is-saved">已保存</span>}
            {saveState === 'error' && <span className="save-status is-error">保存失败</span>}
            <button className="primary-button" type="button" onClick={handleSave} disabled={!editor || saveMutation.isPending}><Save size={18} />{saveMutation.isPending ? '保存中...' : '保存'}</button>
          </div>
        </div>
      </header>

      <div className="editor-shell">
        <div className="editor-toolbar" role="toolbar" aria-label="文档格式工具栏">
          <button type="button" className={editor?.isActive('heading', { level: 1 }) ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="一级标题"><Heading1 size={18} /></button>
          <button type="button" className={editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="二级标题"><Heading2 size={18} /></button>
          <span className="toolbar-divider" />
          <button type="button" className={editor?.isActive('bold') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="粗体"><Bold size={18} /></button>
          <button type="button" className={editor?.isActive('italic') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="斜体"><Italic size={18} /></button>
          <span className="toolbar-divider" />
          <button type="button" className={editor?.isActive('bulletList') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="无序列表"><List size={18} /></button>
          <button type="button" className={editor?.isActive('orderedList') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="有序列表"><ListOrdered size={18} /></button>
          <button type="button" className={editor?.isActive('blockquote') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBlockquote().run()} aria-label="引用"><Quote size={18} /></button>
          <span className="toolbar-divider" />
          <button type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().chain().focus().undo().run()} aria-label="撤销"><Undo2 size={18} /></button>
          <button type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().chain().focus().redo().run()} aria-label="重做"><Redo2 size={18} /></button>
        </div>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </section>
  )
}

export default DocumentEditorPage
