import type {
  Conversation,
  ConversationSummary,
  CreateConversationInput,
} from '../types/conversation'
import { authenticatedFetch } from './authenticatedFetch'

export const conversationsQueryKey = (userId: number | undefined) =>
  ['conversations', userId] as const

export const conversationQueryKey = (userId: number | undefined, conversationId: number) =>
  ['conversation', userId, conversationId] as const

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const response = await authenticatedFetch('/api/conversations')
  if (!response.ok) throw new Error('会话加载失败')
  return response.json() as Promise<ConversationSummary[]>
}

export async function fetchConversation(id: number): Promise<Conversation> {
  const response = await authenticatedFetch(`/api/conversations/${id}`)
  if (!response.ok) throw new Error('会话加载失败')
  return response.json() as Promise<Conversation>
}

export async function createConversation(input: CreateConversationInput): Promise<ConversationSummary> {
  const response = await authenticatedFetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error('会话创建失败')
  return response.json() as Promise<ConversationSummary>
}

export async function deleteConversation(id: number): Promise<void> {
  const response = await authenticatedFetch(`/api/conversations/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('会话删除失败')
}
