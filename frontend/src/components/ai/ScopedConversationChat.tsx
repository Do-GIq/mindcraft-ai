import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Bot, Check, Copy, LoaderCircle, MessageSquarePlus, Send, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  conversationQueryKey,
  conversationsQueryKey,
  createConversation,
  deleteConversation,
  fetchConversation,
  fetchConversations,
} from '../../api/conversationApi'
import { fetchKnowledgeFiles, knowledgeFilesQueryKey } from '../../api/knowledgeApi'
import { MAX_AI_PROMPT_LENGTH, useAiGeneration } from '../../hooks/useAiGeneration'
import { markdownToTiptapHtml } from '../../lib/markdown'
import { useAuthStore } from '../../stores/authStore'

type ScopedConversationChatProps = {
  projectId: number
  documentId?: number | null
  onOpenKnowledge?: () => void
}

function MessageContent({ content }: { content: string }) {
  const html = useMemo(() => markdownToTiptapHtml(content), [content])
  return <div className="conversation-message-content" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function ScopedConversationChat({
  projectId,
  documentId = null,
  onOpenKnowledge,
}: ScopedConversationChatProps) {
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const generation = useAiGeneration()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [pendingUserMessage, setPendingUserMessage] = useState('')
  const [showStreamingMessage, setShowStreamingMessage] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<number | 'stream' | null>(null)
  const [sourceConversationId, setSourceConversationId] = useState<number | null>(null)

  const conversationsQuery = useQuery({
    queryKey: conversationsQueryKey(userId),
    queryFn: fetchConversations,
    enabled: userId !== undefined,
  })
  const scopedConversations = useMemo(
    () => (conversationsQuery.data ?? []).filter((conversation) => (
      conversation.projectId === projectId && conversation.documentId === documentId
    )),
    [conversationsQuery.data, documentId, projectId],
  )
  const selectedConversationExists = scopedConversations.some((conversation) => conversation.id === selectedId)
  const activeSelectedId = selectedConversationExists ? selectedId : scopedConversations[0]?.id ?? null
  const conversationQuery = useQuery({
    queryKey: conversationQueryKey(userId, activeSelectedId ?? 0),
    queryFn: () => fetchConversation(activeSelectedId!),
    enabled: userId !== undefined && activeSelectedId !== null,
  })
  const knowledgeQuery = useQuery({
    queryKey: knowledgeFilesQueryKey(userId, projectId),
    queryFn: () => fetchKnowledgeFiles(projectId),
    enabled: userId !== undefined,
  })
  const createMutation = useMutation({
    mutationFn: () => createConversation({ projectId, documentId }),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) })
      setSelectedId(conversation.id)
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
    setSourceConversationId(activeSelectedId)
    await generation.start(submittedPrompt, undefined, activeSelectedId)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: conversationQueryKey(userId, activeSelectedId) }),
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey(userId) }),
    ])
    setPendingUserMessage('')
    setShowStreamingMessage(false)
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
    if (window.confirm('确定删除这个对话及其全部消息吗？')) deleteMutation.mutate(id)
  }

  const activeConversation = conversationQuery.data
  const knowledgeCount = knowledgeQuery.data?.length ?? 0

  return (
    <section className="scoped-conversation-chat">
      <aside className="conversation-sidebar">
        <div className="conversation-sidebar-header">
          <div><h2>项目问答</h2><p>围绕当前项目持续对话。</p></div>
          <button type="button" onClick={() => createMutation.mutate()} disabled={generation.isGenerating || createMutation.isPending} aria-label="新建对话">
            {createMutation.isPending ? <LoaderCircle className="spin-icon" size={18} /> : <MessageSquarePlus size={19} />}
          </button>
        </div>
        <div className="conversation-list">
          {conversationsQuery.isPending && <p className="conversation-state">正在加载对话...</p>}
          {conversationsQuery.isError && <p className="conversation-state is-error">对话加载失败</p>}
          {createMutation.isError && <p className="conversation-state is-error">新建对话失败，请稍后重试。</p>}
          {deleteMutation.isError && <p className="conversation-state is-error">删除对话失败，请稍后重试。</p>}
          {!conversationsQuery.isPending && scopedConversations.length === 0 && (
            <div className="conversation-list-empty">
              <Bot size={24} />
              <p>还没有项目对话</p>
              <button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>新建对话</button>
            </div>
          )}
          {scopedConversations.map((conversation) => (
            <div className={`conversation-list-item${activeSelectedId === conversation.id ? ' is-active' : ''}`} key={conversation.id}>
              <button type="button" onClick={() => setSelectedId(conversation.id)} disabled={generation.isGenerating}>
                <strong>{conversation.title}</strong>
                <span>{conversation._count.messages} 条消息</span>
                <small>{new Date(conversation.updatedAt).toLocaleString('zh-CN')}</small>
              </button>
              <button
                className="conversation-delete-button"
                type="button"
                onClick={() => removeConversation(conversation.id)}
                disabled={generation.isGenerating || deleteMutation.isPending}
                aria-label={`删除${conversation.title}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="conversation-workspace">
        <header className="conversation-header">
          <div><h2>{activeConversation?.title || '项目问答'}</h2><p>Conversation 仅使用当前项目上下文。</p></div>
          <button className="knowledge-scope-button" type="button" onClick={onOpenKnowledge} disabled={!onOpenKnowledge}>
            <BookOpen size={15} />
            {knowledgeQuery.isPending ? '正在读取项目知识' : knowledgeQuery.isError ? '项目知识状态读取失败' : knowledgeCount > 0 ? `已启用项目知识 · ${knowledgeCount} 个文件` : '当前项目暂无知识文件'}
          </button>
        </header>

        {!activeSelectedId ? (
          <div className="conversation-empty-workspace">
            <span><Bot size={30} /></span>
            <h2>开始项目问答</h2>
            <p>新建对话后，AI 将结合当前项目知识和对话历史回答。</p>
            <button className="primary-button" type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <MessageSquarePlus size={17} />新建对话
            </button>
          </div>
        ) : conversationQuery.isPending ? (
          <div className="conversation-empty-workspace"><LoaderCircle className="spin-icon" size={24} /><p>正在加载消息...</p></div>
        ) : conversationQuery.isError ? (
          <div className="conversation-empty-workspace is-error"><p>对话加载失败，请稍后重试。</p></div>
        ) : (
          <>
            <div className="conversation-messages" aria-live="polite">
              {activeConversation?.messages.length === 0 && !pendingUserMessage && (
                <div className="conversation-messages-empty"><Bot size={26} /><h3>描述你的项目问题</h3><p>AI 会使用最近 20 条消息和当前项目知识。</p></div>
              )}
              {activeConversation?.messages.map((message) => (
                <article className={`conversation-message is-${message.role.toLowerCase()}`} key={message.id}>
                  <div className="conversation-message-meta"><strong>{message.role === 'USER' ? '你' : 'MindCraft AI'}</strong><time>{new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div>
                  <MessageContent content={message.content} />
                  {message.role === 'ASSISTANT' && (
                    <button className="conversation-copy-button" type="button" onClick={() => copyMessage(message.content, message.id)}>
                      {copiedMessageId === message.id ? <Check size={14} /> : <Copy size={14} />}{copiedMessageId === message.id ? '已复制' : '复制'}
                    </button>
                  )}
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
              {!showStreamingMessage && activeSelectedId === sourceConversationId && generation.sources.length > 0 && (
                <aside className="conversation-citations" aria-label="本次回答的参考来源">
                  <div><BookOpen size={16} /><strong>参考来源</strong></div>
                  <ul>{generation.sources.map((source) => <li key={source.fileId}>{source.filename}</li>)}</ul>
                </aside>
              )}
            </div>
            <footer className="conversation-composer">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="输入问题，继续当前项目对话..."
                maxLength={MAX_AI_PROMPT_LENGTH + 1}
                disabled={generation.isGenerating}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
              />
              <div>
                <span className={prompt.length > MAX_AI_PROMPT_LENGTH ? 'is-over-limit' : ''}>{prompt.length} / {MAX_AI_PROMPT_LENGTH}</span>
                <div>
                  {generation.isGenerating && <button className="secondary-button" type="button" onClick={generation.stop}>停止</button>}
                  <button className="primary-button" type="button" onClick={() => void sendMessage()} disabled={generation.isGenerating || !prompt.trim() || prompt.trim().length > MAX_AI_PROMPT_LENGTH}>
                    <Send size={17} />{generation.isGenerating ? '生成中...' : '发送'}
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </section>
  )
}
