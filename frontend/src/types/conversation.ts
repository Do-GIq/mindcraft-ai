export type ConversationMessage = {
  id: number
  conversationId: number
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

export type ConversationSummary = {
  id: number
  title: string
  userId: number
  projectId: number | null
  documentId: number | null
  createdAt: string
  updatedAt: string
  project: { id: number; title: string } | null
  document: { id: number; title: string } | null
  _count: { messages: number }
}

export type Conversation = Omit<ConversationSummary, '_count'> & {
  messages: ConversationMessage[]
}

export type CreateConversationInput = {
  title?: string
  projectId?: number
  documentId?: number
}
