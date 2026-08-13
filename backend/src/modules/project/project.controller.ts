import type { Request, Response } from 'express'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { createProject, deleteProject, getProjects } from './project.service.js'

type CreateProjectBody = {
  title?: unknown
  type?: unknown
  description?: unknown
}

export async function getProjectsController(req: Request, res: Response) {
  try {
    const projects = await getProjects(getAuthenticatedUserId(req))
    res.status(200).json(projects)
  } catch (error) {
    console.error('Failed to get projects:', error)
    res.status(500).json({ message: 'Failed to get projects' })
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
    console.error('Failed to create project:', error)
    res.status(500).json({ message: 'Failed to create project' })
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
    console.error('Failed to delete project:', error)
    res.status(500).json({ message: 'Failed to delete project' })
  }
}
