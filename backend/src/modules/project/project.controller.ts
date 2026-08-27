import type { Request, Response } from 'express'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { createProject, deleteProject, getProject, getProjects, updateProject, type UpdateProjectInput } from './project.service.js'
import { captureRequestException } from '../../lib/sentry.js'

type CreateProjectBody = {
  title?: unknown
  type?: unknown
  description?: unknown
}

type UpdateProjectBody = {
  title?: unknown
  type?: unknown
  description?: unknown
}

const PROJECT_FIELD_MAX_LENGTH = 191
const PROJECT_TYPES = new Set(['GENERAL', 'RAG'])

export function parseProjectUpdateBody(body: UpdateProjectBody):
  | { ok: true; data: UpdateProjectInput }
  | { ok: false; message: string } {
  const data: UpdateProjectInput = {}
  let providedFields = 0

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    providedFields += 1
    if (typeof body.title !== 'string' || !body.title.trim()) return { ok: false, message: 'Title is required' }
    const title = body.title.trim()
    if (title.length > PROJECT_FIELD_MAX_LENGTH) return { ok: false, message: 'Title is too long' }
    data.title = title
  }

  if (Object.prototype.hasOwnProperty.call(body, 'type')) {
    providedFields += 1
    if (typeof body.type !== 'string' || !PROJECT_TYPES.has(body.type)) {
      return { ok: false, message: 'Invalid project type' }
    }
    data.type = body.type as 'GENERAL' | 'RAG'
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    providedFields += 1
    if (body.description !== null && typeof body.description !== 'string') {
      return { ok: false, message: 'Invalid project description' }
    }
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    if (description.length > PROJECT_FIELD_MAX_LENGTH) return { ok: false, message: 'Description is too long' }
    data.description = description || null
  }

  return providedFields > 0
    ? { ok: true, data }
    : { ok: false, message: 'At least one project field is required' }
}

export async function getProjectsController(req: Request, res: Response) {
  try {
    const projects = await getProjects(getAuthenticatedUserId(req))
    res.status(200).json(projects)
  } catch (error) {
    req.logger.error({ err: error }, 'failed to get projects')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to get projects' })
  }
}

export async function getProjectController(req: Request<{ id: string }>, res: Response) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  try {
    const project = await getProject(getAuthenticatedUserId(req), id)

    if (!project) {
      res.status(404).json({ message: 'Project not found' })
      return
    }

    res.status(200).json(project)
  } catch (error) {
    req.logger.error({ err: error }, 'failed to get project')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to get project' })
  }
}

export async function createProjectController(
  req: Request<Record<string, never>, unknown, CreateProjectBody>,
  res: Response,
) {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : ''

  if (!title) {
    res.status(400).json({ message: 'Title is required' })
    return
  }

  const type = typeof req.body.type === 'string' ? req.body.type : undefined
  const description = typeof req.body.description === 'string' ? req.body.description : undefined

  try {
    const project = await createProject(getAuthenticatedUserId(req), {
      title,
      ...(type !== undefined ? { type } : {}),
      ...(description !== undefined ? { description } : {}),
    })
    res.status(201).json(project)
  } catch (error) {
    req.logger.error({ err: error }, 'failed to create project')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to create project' })
  }
}

export async function updateProjectController(
  req: Request<{ id: string }, unknown, UpdateProjectBody>,
  res: Response,
) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  const parsed = parseProjectUpdateBody(req.body)
  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message })
    return
  }

  try {
    const project = await updateProject(getAuthenticatedUserId(req), id, parsed.data)
    if (!project) {
      res.status(404).json({ message: 'Project not found' })
      return
    }
    res.status(200).json(project)
  } catch (error) {
    req.logger.error({ err: error, projectId: id }, 'failed to update project')
    captureRequestException(req, error, { projectId: id })
    res.status(500).json({ message: 'Failed to update project' })
  }
}

export async function deleteProjectController(
  req: Request<{ id: string }>,
  res: Response,
) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  try {
    const deleted = await deleteProject(getAuthenticatedUserId(req), id)

    if (!deleted) {
      res.status(404).json({ message: 'Project not found' })
      return
    }

    res.status(204).send()
  } catch (error) {
    req.logger.error({ err: error }, 'failed to delete project')
    captureRequestException(req, error)
    res.status(500).json({ message: 'Failed to delete project' })
  }
}
