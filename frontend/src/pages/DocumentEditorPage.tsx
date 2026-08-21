import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ArrowLeft, Bold, Heading1, Heading2, History, Italic, List, ListOrdered, Quote, Redo2, RotateCcw, Save, Undo2, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import {
  createDocumentVersion,
  DocumentApiError,
  documentQueryKey,
  documentsQueryKey,
  documentVersionsQueryKey,
  fetchDocument,
  fetchDocumentVersion,
  fetchDocumentVersions,
  restoreDocumentVersion,
  updateDocument,
} from '../api/documentApi'
import { useDocumentAutosave } from '../hooks/useDocumentAutosave'
import DocumentAiAssistant from '../components/editor/DocumentAiAssistant'
import { recordDocumentPageRender } from '../dev/streamBenchmark'
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
  recordDocumentPageRender()

  const { projectId: projectIdParam, documentId: documentIdParam } = useParams()
  const projectId = Number(projectIdParam)
  const documentId = Number(documentIdParam)
  const isValidRoute = Number.isInteger(projectId) && projectId > 0 && Number.isInteger(documentId) && documentId > 0
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [versionFeedback, setVersionFeedback] = useState('')
  const titleRef = useRef('')
  const lastAutoVersionAttemptRef = useRef(0)
  const initializedDocumentId = useRef<number | null>(null)
  const currentDocumentQueryKey = useMemo(() => documentQueryKey(userId, documentId), [documentId, userId])
  const currentVersionsQueryKey = useMemo(() => documentVersionsQueryKey(userId, documentId), [documentId, userId])
  const documentQuery = useQuery({
    queryKey: currentDocumentQueryKey,
    queryFn: () => fetchDocument(documentId),
    enabled: userId !== undefined && isValidRoute,
    retry: (failureCount, error) => !(error instanceof DocumentApiError && error.status === 404) && failureCount < 2,
  })
  const saveMutation = useMutation({
    mutationFn: (input: { title: string; content: string }) => updateDocument(documentId, input),
  })
  const versionsQuery = useQuery({
    queryKey: currentVersionsQueryKey,
    queryFn: () => fetchDocumentVersions(documentId),
    enabled: userId !== undefined && isValidRoute && isHistoryOpen,
  })
  const versionDetailQuery = useQuery({
    queryKey: [...currentVersionsQueryKey, selectedVersionId],
    queryFn: () => fetchDocumentVersion(documentId, selectedVersionId!),
    enabled: userId !== undefined && isValidRoute && isHistoryOpen && selectedVersionId !== null,
  })
  const manualVersionMutation = useMutation({
    mutationFn: (snapshot: { title: string; content: string }) => createDocumentVersion(documentId, 'MANUAL', snapshot),
    onSuccess: async (result) => {
      setVersionFeedback(result.status === 'created' ? '已保存版本' : '当前内容已存在版本')
      await queryClient.invalidateQueries({ queryKey: currentVersionsQueryKey })
    },
  })
  const autosave = useDocumentAutosave({
    save: (snapshot) => saveMutation.mutateAsync(snapshot),
    onSaved: (document) => {
      const previousDocument = queryClient.getQueryData<Document>(currentDocumentQueryKey)
      queryClient.setQueryData(currentDocumentQueryKey, document)
      if (previousDocument?.title !== document.title) {
        void queryClient.invalidateQueries({ queryKey: documentsQueryKey(userId, document.projectId) })
      }
      const now = Date.now()
      if (now - lastAutoVersionAttemptRef.current >= 10 * 60 * 1000) {
        lastAutoVersionAttemptRef.current = now
        void createDocumentVersion(documentId, 'AUTO')
          .then((result) => {
            if (result.status === 'created') {
              void queryClient.invalidateQueries({ queryKey: currentVersionsQueryKey })
            }
          })
          .catch(() => {
            lastAutoVersionAttemptRef.current = 0
          })
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
  const versionPreviewEditor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: false,
    immediatelyRender: false,
  })
  const restoreVersionMutation = useMutation({
    mutationFn: (versionId: number) => restoreDocumentVersion(documentId, versionId),
    onSuccess: async (result) => {
      const restored = result.document
      titleRef.current = restored.title
      setTitle(restored.title)
      editor?.commands.setContent(restored.content, { emitUpdate: false })
      autosave.initialize({ title: restored.title, content: restored.content })
      queryClient.setQueryData(currentDocumentQueryKey, restored)
      setVersionFeedback(result.status === 'restored' ? '版本已恢复' : '当前已经是此版本')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: currentVersionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: documentsQueryKey(userId, restored.projectId) }),
      ])
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

  useEffect(() => {
    if (!versionPreviewEditor || !versionDetailQuery.data) return
    versionPreviewEditor.commands.setContent(versionDetailQuery.data.content, { emitUpdate: false })
  }, [versionDetailQuery.data, versionPreviewEditor])

  function handleTitleChange(value: string) {
    titleRef.current = value
    setTitle(value)
    if (editor) autosave.markChanged({ title: value, content: editor.getHTML() })
  }

  function handleSave() {
    if (!editor) return
    autosave.saveNow({ title: title.trim(), content: editor.getHTML() })
  }

  function saveCurrentVersion() {
    if (!editor || manualVersionMutation.isPending) return
    setVersionFeedback('')
    manualVersionMutation.mutate({ title: title.trim(), content: editor.getHTML() })
  }

  function restoreSelectedVersion() {
    if (selectedVersionId === null || restoreVersionMutation.isPending) return
    if (autosave.status !== 'saved') {
      setVersionFeedback('请先等待当前文档保存完成')
      return
    }
    setVersionFeedback('')
    restoreVersionMutation.mutate(selectedVersionId)
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
            <button className="secondary-button editor-header-button" type="button" onClick={() => { setIsHistoryOpen(true); setVersionFeedback('') }}><History size={17} />历史版本</button>
            <button className="primary-button editor-header-button" type="button" onClick={handleSave} disabled={!editor || autosave.status === 'saving'}><Save size={18} />{autosave.status === 'saving' ? '保存中...' : '保存'}</button>
          </div>
        </div>
      </header>

      <div className="editor-shell">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>

      <DocumentAiAssistant documentId={documentId} editor={editor} />

      {isHistoryOpen && (
        <div className="history-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsHistoryOpen(false) }}>
          <aside className="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-drawer-title">
            <header className="history-drawer-header">
              <div><h2 id="history-drawer-title">历史版本</h2><p>预览并恢复当前文档的内容快照。</p></div>
              <button type="button" onClick={() => setIsHistoryOpen(false)} aria-label="关闭历史版本"><X size={20} /></button>
            </header>

            <button className="primary-button history-save-button" type="button" onClick={saveCurrentVersion} disabled={!editor || manualVersionMutation.isPending}>
              <Save size={17} />{manualVersionMutation.isPending ? '保存中...' : '保存当前版本'}
            </button>
            {versionFeedback && <p className="history-feedback">{versionFeedback}</p>}
            {(manualVersionMutation.isError || restoreVersionMutation.isError) && <p className="history-error">版本操作失败，请稍后重试。</p>}

            <div className="history-drawer-body">
              <div className="history-version-list">
                {versionsQuery.isPending && <p className="history-state">正在加载历史版本...</p>}
                {versionsQuery.isError && <p className="history-state is-error">历史版本加载失败。</p>}
                {versionsQuery.data?.length === 0 && <p className="history-state">还没有历史版本。</p>}
                {versionsQuery.data?.map((version) => (
                  <button className={`history-version-item${selectedVersionId === version.id ? ' is-active' : ''}`} type="button" key={version.id} onClick={() => { setSelectedVersionId(version.id); setVersionFeedback('') }}>
                    <span>{new Date(version.createdAt).toLocaleString('zh-CN')}</span>
                    <small className={`version-source is-${version.source.toLowerCase()}`}>{version.source === 'AUTO' ? '自动' : version.source === 'MANUAL' ? '手动' : '恢复备份'}</small>
                  </button>
                ))}
              </div>

              <div className="history-preview">
                {selectedVersionId === null ? <p className="history-state">选择一个版本进行只读预览。</p> : versionDetailQuery.isPending ? <p className="history-state">正在加载版本内容...</p> : versionDetailQuery.isError ? <p className="history-state is-error">版本内容加载失败。</p> : (
                  <>
                    <h3>{versionDetailQuery.data?.title}</h3>
                    <EditorContent editor={versionPreviewEditor} className="history-preview-content" />
                    <button className="secondary-button history-restore-button" type="button" onClick={restoreSelectedVersion} disabled={restoreVersionMutation.isPending || autosave.status !== 'saved'}>
                      <RotateCcw size={17} />{restoreVersionMutation.isPending ? '恢复中...' : '恢复此版本'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

export default DocumentEditorPage
