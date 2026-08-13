import type { Request, Response } from 'express'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { createDocument, findOwnedProject, getDocuments } from './document.service.js'

type ProjectParams = { projectId: string }
type CreateDocumentBody = { title?: unknown }

function parseProjectId(value: string) {
  const projectId = Number(value)
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null
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
