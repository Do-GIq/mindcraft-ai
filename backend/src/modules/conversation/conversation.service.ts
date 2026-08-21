import { prisma } from '../../db/prisma.js'
import type { AiModelMessage } from '../ai/ai.service.js'

type CreateConversationInput = {
  title?: string
  projectId?: number
  documentId?: number
}

export async function createConversation(userId: number, input: CreateConversationInput) {
  let projectId = input.projectId
  let documentId = input.documentId

  if (projectId !== undefined) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
    if (!project) return null
  }

  if (documentId !== undefined) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, project: { userId } },
      select: { id: true, projectId: true },
    })
    if (!document || (projectId !== undefined && projectId !== document.projectId)) return null
    documentId = document.id
    projectId = document.projectId
  }

  return prisma.conversation.create({
    data: {
      title: input.title?.trim() || '新会话',
      userId,
      ...(projectId !== undefined ? { projectId } : {}),
      ...(documentId !== undefined ? { documentId } : {}),
    },
    include: {
      project: { select: { id: true, title: true } },
      document: { select: { id: true, title: true } },
      _count: { select: { messages: true } },
    },
  })
}

export function getConversations(userId: number) {
  return prisma.conversation.findMany({
    where: { userId },
    include: {
      project: { select: { id: true, title: true } },
      document: { select: { id: true, title: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export function getConversation(userId: number, id: number) {
  return prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      project: { select: { id: true, title: true } },
      document: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function deleteConversation(userId: number, id: number) {
  const result = await prisma.conversation.deleteMany({ where: { id, userId } })
  return result.count > 0
}

export async function appendUserMessageAndGetContext(
  userId: number,
  conversationId: number,
  content: string,
) {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, documentId: true },
    })
    if (!conversation) return null

    await tx.message.create({ data: { conversationId, role: 'USER', content } })
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    const recentMessages = await tx.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      select: { role: true, content: true },
    })

    const messages: AiModelMessage[] = recentMessages.reverse().map((message) => ({
      role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
      content: message.content,
    }))
    return { conversation, messages }
  })
}

export async function appendAssistantMessage(
  userId: number,
  conversationId: number,
  content: string,
) {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    })
    if (!conversation) return false

    await tx.message.create({ data: { conversationId, role: 'ASSISTANT', content } })
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    return true
  })
}
