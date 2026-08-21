import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Check, Copy, LoaderCircle, MessageSquarePlus, Plus, Send, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  conversationQueryKey,
  conversationsQueryKey,
  createConversation,
  deleteConversation,
  fetchConversation,
  fetchConversations,
} from '../api/conversationApi'
import { documentsQueryKey, fetchDocuments } from '../api/documentApi'
import { fetchProjects, projectsQueryKey } from '../api/projectApi'
import { MAX_AI_PROMPT_LENGTH, useAiGeneration } from '../hooks/useAiGeneration'
import { markdownToTiptapHtml } from '../lib/markdown'
import { useAuthStore } from '../stores/authStore'

function MessageContent({ content }: { content: string }) {
  const html = useMemo(() => markdownToTiptapHtml(content), [content])
  return <div className="conversation-message-content" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function AiCreatePage() {
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const generation = useAiGeneration()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [pendingUserMessage, setPendingUserMessage] = useState('')
  const [showStreamingMessage, setShowStreamingMessage] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<number | 'stream' | null>(null)

  const conversationsQuery = useQuery({ queryKey: conversationsQueryKey(userId), queryFn: fetchConversations, enabled: userId !== undefined })
  const activeSelectedId = selectedId ?? conversationsQuery.data?.[0]?.id ?? null
  const conversationQuery = useQuery({ queryKey: conversationQueryKey(userId, activeSelectedId ?? 0), queryFn: () => fetchConversation(activeSelectedId!), enabled: userId !== undefined && activeSelectedId !== null })
  const projectsQuery = useQuery({ queryKey: projectsQueryKey(userId), queryFn: fetchProjects, enabled: userId !== undefined && isCreateOpen })
  const selectedProjectId = Number(projectId)
  const documentsQuery = useQuery({
    queryKey: documentsQueryKey(userId, selectedProjectId),
    queryFn: () => fetchDocuments(selectedProjectId),
    enabled: userId !== undefined && isCreateOpen && Number.isInteger(selectedProjectId) && selectedProjectId > 0,
  })
  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) })
      setSelectedId(conversation.id)
      setIsCreateOpen(false)
      setTitle('')
      setProjectId('')
      setDocumentId('')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: async (_, deletedId) => {
      if (activeSelectedId === deletedId) setSelectedId(null)
      queryClient.removeQueries({ queryKey: conversationQueryKey(userId, deletedId) })
      await queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) })
    },
  })

  async function sendMessage() {
    const submittedPrompt = prompt.trim()
    if (!activeSelectedId || !submittedPrompt || submittedPrompt.length > MAX_AI_PROMPT_LENGTH || generation.isGenerating) return

    setPrompt('')
    setPendingUserMessage(submittedPrompt)
    setShowStreamingMessage(true)
    await generation.start(submittedPrompt, undefined, activeSelectedId)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: conversationQueryKey(userId, activeSelectedId) }),
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) }),
    ])
    setPendingUserMessage('')
    setShowStreamingMessage(false)
  }

  function submitConversation() {
    if (createMutation.isPending) return
    createMutation.mutate({
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(projectId ? { projectId: Number(projectId) } : {}),
      ...(documentId ? { documentId: Number(documentId) } : {}),
    })
  }

  async function copyMessage(content: string, id: number | 'stream') {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(id)
      window.setTimeout(() => setCopiedMessageId((current) => current === id ? null : current), 1_800)
    } catch {
      setCopiedMessageId(null)
    }
  }

  function removeConversation(id: number) {
    if (generation.isGenerating || deleteMutation.isPending) return
    if (window.confirm('确定删除这个会话及其全部消息吗？')) deleteMutation.mutate(id)
  }

  const activeConversation = conversationQuery.data

  return (
    <section className="conversation-page">
      <aside className="conversation-sidebar">
        <div className="conversation-sidebar-header">
          <div><h1>AI 助手</h1><p>带着上下文持续完成创作。</p></div>
          <button type="button" onClick={() => setIsCreateOpen(true)} disabled={generation.isGenerating} aria-label="新建会话"><MessageSquarePlus size={19} /></button>
        </div>

        <div className="conversation-list">
          {conversationsQuery.isPending && <p className="conversation-state">正在加载会话...</p>}
          {conversationsQuery.isError && <p className="conversation-state is-error">会话加载失败</p>}
          {conversationsQuery.data?.length === 0 && <div className="conversation-list-empty"><Bot size={24} /><p>还没有会话</p><button type="button" onClick={() => setIsCreateOpen(true)}>新建会话</button></div>}
          {conversationsQuery.data?.map((conversation) => (
            <div className={`conversation-list-item${activeSelectedId === conversation.id ? ' is-active' : ''}`} key={conversation.id}>
              <button type="button" onClick={() => setSelectedId(conversation.id)} disabled={generation.isGenerating}>
                <strong>{conversation.title}</strong>
                <span>{conversation.document?.title || conversation.project?.title || '普通 AI 会话'}</span>
                <small>{new Date(conversation.updatedAt).toLocaleString('zh-CN')}</small>
              </button>
              <button className="conversation-delete-button" type="button" onClick={() => removeConversation(conversation.id)} aria-label={`删除${conversation.title}`}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </aside>

      <div className="conversation-workspace">
        {!activeSelectedId ? (
          <div className="conversation-empty-workspace"><span><Bot size={30} /></span><h2>开始一段 AI 创作会话</h2><p>创建会话后，AI 会在最近 20 条消息范围内延续上下文。</p><button className="primary-button" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={17} />新建会话</button></div>
        ) : conversationQuery.isPending ? (
          <div className="conversation-empty-workspace"><LoaderCircle className="spin-icon" size={24} /><p>正在加载消息...</p></div>
        ) : conversationQuery.isError ? (
          <div className="conversation-empty-workspace is-error"><p>会话加载失败，请稍后重试。</p></div>
        ) : (
          <>
            <header className="conversation-header">
              <div><h2>{activeConversation?.title}</h2><p>{activeConversation?.document ? `文档：${activeConversation.document.title}` : activeConversation?.project ? `项目：${activeConversation.project.title}` : '普通 AI 会话'}</p></div>
              <span>{activeConversation?.messages.length ?? 0} 条历史消息</span>
            </header>

            <div className="conversation-messages" aria-live="polite">
              {activeConversation?.messages.length === 0 && !pendingUserMessage && <div className="conversation-messages-empty"><Bot size={26} /><h3>描述你的创作需求</h3><p>AI 会基于这段会话的历史消息持续回答。</p></div>}
              {activeConversation?.messages.map((message) => (
                <article className={`conversation-message is-${message.role.toLowerCase()}`} key={message.id}>
                  <div className="conversation-message-meta"><strong>{message.role === 'USER' ? '你' : 'MindCraft AI'}</strong><time>{new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div>
                  <MessageContent content={message.content} />
                  {message.role === 'ASSISTANT' && <button className="conversation-copy-button" type="button" onClick={() => copyMessage(message.content, message.id)}>{copiedMessageId === message.id ? <Check size={14} /> : <Copy size={14} />}{copiedMessageId === message.id ? '已复制' : '复制'}</button>}
                </article>
              ))}
              {pendingUserMessage && <article className="conversation-message is-user"><div className="conversation-message-meta"><strong>你</strong><span>刚刚</span></div><MessageContent content={pendingUserMessage} /></article>}
              {showStreamingMessage && (
                <article className="conversation-message is-assistant">
                  <div className="conversation-message-meta"><strong>MindCraft AI</strong><span>{generation.isGenerating ? '正在生成' : generation.status === 'error' ? '生成失败' : '刚刚'}</span></div>
                  {generation.output ? <MessageContent content={generation.output} /> : generation.isGenerating ? <div className="conversation-streaming-start"><LoaderCircle className="spin-icon" size={17} />正在思考...</div> : null}
                  {generation.output && <button className="conversation-copy-button" type="button" onClick={() => copyMessage(generation.output, 'stream')}>{copiedMessageId === 'stream' ? <Check size={14} /> : <Copy size={14} />}{copiedMessageId === 'stream' ? '已复制' : '复制'}</button>}
                  {generation.errorMessage && <p className="ai-error-message">{generation.errorMessage}</p>}
                </article>
              )}
            </div>

            <footer className="conversation-composer">
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="输入消息，继续当前创作上下文..." maxLength={MAX_AI_PROMPT_LENGTH + 1} disabled={generation.isGenerating} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} />
              <div><span className={prompt.length > MAX_AI_PROMPT_LENGTH ? 'is-over-limit' : ''}>{prompt.length} / {MAX_AI_PROMPT_LENGTH}</span><div>{generation.isGenerating && <button className="secondary-button" type="button" onClick={generation.stop}>停止</button>}<button className="primary-button" type="button" onClick={() => void sendMessage()} disabled={generation.isGenerating || !prompt.trim() || prompt.trim().length > MAX_AI_PROMPT_LENGTH}><Send size={17} />{generation.isGenerating ? '生成中...' : '发送'}</button></div></div>
            </footer>
          </>
        )}
      </div>

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false) }}>
          <section className="create-conversation-modal" role="dialog" aria-modal="true" aria-labelledby="create-conversation-title">
            <header><div><h2 id="create-conversation-title">新建 AI 会话</h2><p>可选择项目或文档作为当前工作上下文。</p></div><button type="button" onClick={() => setIsCreateOpen(false)} aria-label="关闭"><X size={19} /></button></header>
            <label>会话标题（可选）<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="例如：完善产品发布方案" /></label>
            <label>关联项目（可选）<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setDocumentId('') }}><option value="">普通 AI 会话</option>{projectsQuery.data?.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select></label>
            <label>关联文档（可选）<select value={documentId} onChange={(event) => setDocumentId(event.target.value)} disabled={!projectId || documentsQuery.isPending}><option value="">仅关联项目</option>{documentsQuery.data?.map((document) => <option value={document.id} key={document.id}>{document.title}</option>)}</select></label>
            {createMutation.isError && <p className="modal-error">会话创建失败，请检查关联资源后重试。</p>}
            <footer><button className="secondary-button" type="button" onClick={() => setIsCreateOpen(false)}>取消</button><button className="primary-button" type="button" onClick={submitConversation} disabled={createMutation.isPending}>{createMutation.isPending ? '创建中...' : '创建会话'}</button></footer>
          </section>
        </div>
      )}
    </section>
  )
}
