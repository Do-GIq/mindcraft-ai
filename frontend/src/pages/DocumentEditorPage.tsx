import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ArrowLeft, Bold, Heading1, Heading2, Italic, List, ListOrdered, Quote, Redo2, Save, Undo2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { DocumentApiError, documentQueryKey, documentsQueryKey, fetchDocument, updateDocument } from '../api/documentApi'
import { useDocumentAutosave } from '../hooks/useDocumentAutosave'
import { useAuthStore } from '../stores/authStore'
import type { Document } from '../types/document'

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      heading1: currentEditor?.isActive('heading', { level: 1 }) ?? false,
      heading2: currentEditor?.isActive('heading', { level: 2 }) ?? false,
      bold: currentEditor?.isActive('bold') ?? false,
      italic: currentEditor?.isActive('italic') ?? false,
      bulletList: currentEditor?.isActive('bulletList') ?? false,
      orderedList: currentEditor?.isActive('orderedList') ?? false,
      blockquote: currentEditor?.isActive('blockquote') ?? false,
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
    }),
  })

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="文档格式工具栏">
      <button type="button" className={toolbarState?.heading1 ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="一级标题"><Heading1 size={18} /></button>
      <button type="button" className={toolbarState?.heading2 ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="二级标题"><Heading2 size={18} /></button>
      <span className="toolbar-divider" />
      <button type="button" className={toolbarState?.bold ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="粗体"><Bold size={18} /></button>
      <button type="button" className={toolbarState?.italic ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="斜体"><Italic size={18} /></button>
      <span className="toolbar-divider" />
      <button type="button" className={toolbarState?.bulletList ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="无序列表"><List size={18} /></button>
      <button type="button" className={toolbarState?.orderedList ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="有序列表"><ListOrdered size={18} /></button>
      <button type="button" className={toolbarState?.blockquote ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBlockquote().run()} aria-label="引用"><Quote size={18} /></button>
      <span className="toolbar-divider" />
      <button type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={!toolbarState?.canUndo} aria-label="撤销"><Undo2 size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={!toolbarState?.canRedo} aria-label="重做"><Redo2 size={18} /></button>
    </div>
  )
}

function DocumentEditorPage() {
  const { projectId: projectIdParam, documentId: documentIdParam } = useParams()
  const projectId = Number(projectIdParam)
  const documentId = Number(documentIdParam)
  const isValidRoute = Number.isInteger(projectId) && projectId > 0 && Number.isInteger(documentId) && documentId > 0
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const titleRef = useRef('')
  const initializedDocumentId = useRef<number | null>(null)
  const currentDocumentQueryKey = useMemo(() => documentQueryKey(userId, documentId), [documentId, userId])
  const documentQuery = useQuery({
    queryKey: currentDocumentQueryKey,
    queryFn: () => fetchDocument(documentId),
    enabled: userId !== undefined && isValidRoute,
    retry: (failureCount, error) => !(error instanceof DocumentApiError && error.status === 404) && failureCount < 2,
  })
  const saveMutation = useMutation({
    mutationFn: (input: { title: string; content: string }) => updateDocument(documentId, input),
  })
  const autosave = useDocumentAutosave({
    save: (snapshot) => saveMutation.mutateAsync(snapshot),
    onSaved: (document) => {
      const previousDocument = queryClient.getQueryData<Document>(currentDocumentQueryKey)
      queryClient.setQueryData(currentDocumentQueryKey, document)
      if (previousDocument?.title !== document.title) {
        void queryClient.invalidateQueries({ queryKey: documentsQueryKey(userId, document.projectId) })
      }
    },
  })
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      autosave.markChanged({ title: titleRef.current, content: currentEditor.getHTML() })
    },
  })

  useEffect(() => {
    const document = documentQuery.data
    if (!document || !editor || initializedDocumentId.current === document.id) return

    titleRef.current = document.title
    setTitle(document.title)
    editor.commands.setContent(document.content, { emitUpdate: false })
    autosave.initialize({ title: document.title, content: document.content })
    initializedDocumentId.current = document.id
  }, [autosave, documentQuery.data, editor])

  function handleTitleChange(value: string) {
    titleRef.current = value
    setTitle(value)
    if (editor) autosave.markChanged({ title: value, content: editor.getHTML() })
  }

  function handleSave() {
    if (!editor) return
    autosave.saveNow({ title: title.trim(), content: editor.getHTML() })
  }

  const returnLink = `/projects/${documentQuery.data?.projectId ?? projectId}`

  if (!isValidRoute) return <div className="editor-state is-error"><p>文档不存在或无权访问</p><Link to="/projects">返回我的项目</Link></div>
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
          <input className="document-title-input" value={title} onChange={(event) => handleTitleChange(event.target.value)} aria-label="文档标题" />
          <div className="save-area">
            <span className={`save-status is-${autosave.status}`}>
              {autosave.status === 'saving' ? '正在保存...' : autosave.status === 'unsaved' ? '未保存' : autosave.status === 'error' ? '保存失败' : '已保存'}
            </span>
            <button className="primary-button" type="button" onClick={handleSave} disabled={!editor || autosave.status === 'saving'}><Save size={18} />{autosave.status === 'saving' ? '保存中...' : '保存'}</button>
          </div>
        </div>
      </header>

      <div className="editor-shell">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </section>
  )
}

export default DocumentEditorPage
