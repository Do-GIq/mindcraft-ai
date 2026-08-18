import type { Request, Response } from 'express'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { captureRequestException } from '../../lib/sentry.js'
import {
  createDocument,
  createDocumentVersion,
  findOwnedProject,
  getDocuments,
  getDocumentVersion,
  getDocumentVersions,
  getOwnedDocument,
  restoreDocumentVersion,
  updateDocument,
} from './document.service.js'

type ProjectParams = { projectId: string }
type CreateDocumentBody = { title?: unknown }
type DocumentParams = { id: string }
type UpdateDocumentBody = { title?: unknown; content?: unknown }
type VersionParams = { id: string; versionId: string }
type CreateVersionBody = { source?: unknown; title?: unknown; content?: unknown }

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
    req.logger.error({ err: error }, 'failed to get document')
    captureRequestException(req, error)
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
    req.logger.error({ err: error }, 'failed to update document')
    captureRequestException(req, error)
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
    req.logger.error({ err: error }, 'failed to get documents')
    captureRequestException(req, error)
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
    req.logger.error({ err: error }, 'failed to create document')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to create document' })
  }
}

export async function getDocumentVersionsController(req: Request<DocumentParams>, res: Response) {
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
    res.status(200).json(await getDocumentVersions(getAuthenticatedUserId(req), documentId))
  } catch (error) {
    req.logger.error({ err: error, documentId }, 'failed to get document versions')
    captureRequestException(req, error, { documentId })
    res.status(500).json({ message: 'Failed to get document versions' })
  }
}

export async function getDocumentVersionController(req: Request<VersionParams>, res: Response) {
  const documentId = parseDocumentId(req.params.id)
  const versionId = parseDocumentId(req.params.versionId)
  if (!documentId || !versionId) {
    res.status(400).json({ message: 'Invalid document or version id' })
    return
  }

  try {
    const version = await getDocumentVersion(getAuthenticatedUserId(req), documentId, versionId)
    if (!version) {
      res.status(404).json({ message: 'Document version not found' })
      return
    }
    res.status(200).json(version)
  } catch (error) {
    req.logger.error({ err: error, documentId, versionId }, 'failed to get document version')
    captureRequestException(req, error, { documentId, versionId })
    res.status(500).json({ message: 'Failed to get document version' })
  }
}

export async function createDocumentVersionController(
  req: Request<DocumentParams, unknown, CreateVersionBody>,
  res: Response,
) {
  const documentId = parseDocumentId(req.params.id)
  if (!documentId) {
    res.status(400).json({ message: 'Invalid document id' })
    return
  }

  const source = req.body?.source
  if (source !== 'AUTO' && source !== 'MANUAL') {
    res.status(400).json({ message: 'Invalid version source' })
    return
  }

  let snapshot: { title: string; content: string } | undefined
  if (source === 'MANUAL' && (req.body.title !== undefined || req.body.content !== undefined)) {
    if (typeof req.body.title !== 'string' || !req.body.title.trim() || typeof req.body.content !== 'string') {
      res.status(400).json({ message: 'Invalid version snapshot' })
      return
    }
    snapshot = { title: req.body.title.trim(), content: req.body.content }
  }

  try {
    const result = await createDocumentVersion(
      getAuthenticatedUserId(req),
      documentId,
      source,
      snapshot,
    )
    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Document not found' })
      return
    }
    res.status(result.status === 'created' ? 201 : 200).json(result)
  } catch (error) {
    req.logger.error({ err: error, documentId, source }, 'failed to create document version')
    captureRequestException(req, error, { documentId, source })
    res.status(500).json({ message: 'Failed to create document version' })
  }
}

export async function restoreDocumentVersionController(req: Request<VersionParams>, res: Response) {
  const documentId = parseDocumentId(req.params.id)
  const versionId = parseDocumentId(req.params.versionId)
  if (!documentId || !versionId) {
    res.status(400).json({ message: 'Invalid document or version id' })
    return
  }

  try {
    const result = await restoreDocumentVersion(
      getAuthenticatedUserId(req),
      documentId,
      versionId,
    )
    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Document version not found' })
      return
    }
    res.status(200).json(result)
  } catch (error) {
    req.logger.error({ err: error, documentId, versionId }, 'failed to restore document version')
    captureRequestException(req, error, { documentId, versionId })
    res.status(500).json({ message: 'Failed to restore document version' })
  }
}
