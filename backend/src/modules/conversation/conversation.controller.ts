import type { Request, Response } from 'express'
import { captureRequestException } from '../../lib/sentry.js'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
} from './conversation.service.js'

type CreateConversationBody = {
  title?: unknown
  projectId?: unknown
  documentId?: unknown
}

function parseOptionalId(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parseId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function createConversationController(
  req: Request<Record<string, never>, unknown, CreateConversationBody>,
  res: Response,
) {
  const projectId = parseOptionalId(req.body.projectId)
  const documentId = parseOptionalId(req.body.documentId)
  if (projectId === null || documentId === null) {
    res.status(400).json({ message: 'Invalid project or document id' })
    return
  }

  const title = typeof req.body.title === 'string' ? req.body.title.trim() : undefined
  if (title && title.length > 120) {
    res.status(400).json({ message: 'Title is too long' })
    return
  }

  try {
    const conversation = await createConversation(getAuthenticatedUserId(req), {
      ...(title !== undefined ? { title } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(documentId !== undefined ? { documentId } : {}),
    })
    if (!conversation) {
      res.status(404).json({ message: 'Project or document not found' })
      return
    }
    res.status(201).json(conversation)
  } catch (error) {
    req.logger.error({ err: error }, 'failed to create conversation')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to create conversation' })
  }
}

export async function getConversationsController(req: Request, res: Response) {
  try {
    res.status(200).json(await getConversations(getAuthenticatedUserId(req)))
  } catch (error) {
    req.logger.error({ err: error }, 'failed to get conversations')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to get conversations' })
  }
}

export async function getConversationController(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id)
  if (!id) {
    res.status(400).json({ message: 'Invalid conversation id' })
    return
  }

  try {
    const conversation = await getConversation(getAuthenticatedUserId(req), id)
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' })
      return
    }
    res.status(200).json(conversation)
  } catch (error) {
    req.logger.error({ err: error }, 'failed to get conversation')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to get conversation' })
  }
}

export async function deleteConversationController(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id)
  if (!id) {
    res.status(400).json({ message: 'Invalid conversation id' })
    return
  }

  try {
    const deleted = await deleteConversation(getAuthenticatedUserId(req), id)
    if (!deleted) {
      res.status(404).json({ message: 'Conversation not found' })
      return
    }
    res.status(204).send()
  } catch (error) {
    req.logger.error({ err: error }, 'failed to delete conversation')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to delete conversation' })
  }
}
