import type { Request, Response } from 'express'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import {
  createDocument,
  findOwnedProject,
  getDocuments,
  getOwnedDocument,
  updateDocument,
} from './document.service.js'

type ProjectParams = { projectId: string }
type CreateDocumentBody = { title?: unknown }
type DocumentParams = { id: string }
type UpdateDocumentBody = { title?: unknown; content?: unknown }

function parseProjectId(value: string) {
  const projectId = Number(value)
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null
}

function parseDocumentId(value: string) {
  const documentId = Number(value)
  return Number.isInteger(documentId) && documentId > 0 ? documentId : null
}

export async function getDocumentController(req: Request<DocumentParams>, res: Response) {
  const documentId = parseDocumentId(req.params.id)

  if (!documentId) {
    res.status(400).json({ message: 'Invalid document id' })
    return
  }

  try {
    const document = await getOwnedDocument(getAuthenticatedUserId(req), documentId)
    if (!document) {
      res.status(404).json({ message: 'Document not found' })
      return
    }

    res.status(200).json(document)
  } catch (error) {
    console.error('Failed to get document:', error)
    res.status(500).json({ message: 'Failed to get document' })
  }
}

export async function updateDocumentController(
  req: Request<DocumentParams, unknown, UpdateDocumentBody>,
  res: Response,
) {
  const documentId = parseDocumentId(req.params.id)

  if (!documentId) {
    res.status(400).json({ message: 'Invalid document id' })
    return
  }

  const body = req.body ?? {}
  const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title')
  const hasContent = Object.prototype.hasOwnProperty.call(body, 'content')

  if (!hasTitle && !hasContent) {
    res.status(400).json({ message: 'Title or content is required' })
    return
  }

  if (hasTitle && typeof body.title !== 'string') {
    res.status(400).json({ message: 'Invalid title' })
    return
  }

  if (hasContent && typeof body.content !== 'string') {
    res.status(400).json({ message: 'Invalid content' })
    return
  }

  const title = typeof body.title === 'string' ? body.title.trim() : undefined
  if (hasTitle && !title) {
    res.status(400).json({ message: 'Title cannot be empty' })
    return
  }

  try {
    const document = await getOwnedDocument(getAuthenticatedUserId(req), documentId)
    if (!document) {
      res.status(404).json({ message: 'Document not found' })
      return
    }

    const updated = await updateDocument(documentId, {
      ...(title !== undefined ? { title } : {}),
      ...(typeof body.content === 'string' ? { content: body.content } : {}),
    })
    res.status(200).json(updated)
  } catch (error) {
    console.error('Failed to update document:', error)
    res.status(500).json({ message: 'Failed to update document' })
  }
}

export async function getDocumentsController(req: Request<ProjectParams>, res: Response) {
  const projectId = parseProjectId(req.params.projectId)

  if (!projectId) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  try {
    const project = await findOwnedProject(getAuthenticatedUserId(req), projectId)
    if (!project) {
      res.status(404).json({ message: 'Project not found' })
      return
    }

    res.status(200).json(await getDocuments(projectId))
  } catch (error) {
    console.error('Failed to get documents:', error)
    res.status(500).json({ message: 'Failed to get documents' })
  }
}

export async function createDocumentController(
  req: Request<ProjectParams, unknown, CreateDocumentBody>,
  res: Response,
) {
  const projectId = parseProjectId(req.params.projectId)

  if (!projectId) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  const title = typeof req.body.title === 'string' ? req.body.title.trim() : ''

  try {
    const project = await findOwnedProject(getAuthenticatedUserId(req), projectId)
    if (!project) {
      res.status(404).json({ message: 'Project not found' })
      return
    }

    res.status(201).json(await createDocument(projectId, title || '未命名文档'))
  } catch (error) {
    console.error('Failed to create document:', error)
    res.status(500).json({ message: 'Failed to create document' })
  }
}
