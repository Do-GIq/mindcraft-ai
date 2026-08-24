import type { Request, Response } from 'express'
import { captureRequestException } from '../../lib/sentry.js'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { createKnowledgeFile, getKnowledgeFiles } from './knowledge.service.js'

export const MAX_KNOWLEDGE_FILE_BYTES = 60 * 1024
const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.txt']

function parseProjectId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isAllowedFilename(filename: string) {
  const lower = filename.toLowerCase()
  return ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

export async function getKnowledgeFilesController(req: Request<{ projectId: string }>, res: Response) {
  const projectId = parseProjectId(req.params.projectId)
  if (!projectId) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  try {
    const files = await getKnowledgeFiles(getAuthenticatedUserId(req), projectId)
    if (!files) {
      res.status(404).json({ message: 'Project not found' })
      return
    }
    res.status(200).json(files)
  } catch (error) {
    req.logger.error({ err: error, projectId }, 'failed to get knowledge files')
    captureRequestException(req, error, { projectId })
    res.status(500).json({ message: 'Failed to get knowledge files' })
  }
}

export async function uploadKnowledgeFileController(req: Request<{ projectId: string }>, res: Response) {
  const projectId = parseProjectId(req.params.projectId)
  if (!projectId) {
    res.status(400).json({ message: 'Invalid project id' })
    return
  }

  const file = req.file
  if (!file || !isAllowedFilename(file.originalname)) {
    res.status(400).json({ message: 'Only Markdown and TXT files are supported' })
    return
  }
  if (file.size > MAX_KNOWLEDGE_FILE_BYTES) {
    res.status(400).json({ message: 'File must not exceed 60 KB' })
    return
  }
  if (file.originalname.length > 180) {
    res.status(400).json({ message: 'Filename is too long' })
    return
  }

  const content = file.buffer.toString('utf8')
  if (!content.trim()) {
    res.status(400).json({ message: 'Knowledge file is empty' })
    return
  }

  const userId = getAuthenticatedUserId(req)
  try {
    const created = await createKnowledgeFile({ userId, projectId, filename: file.originalname, content })
    if (!created) {
      res.status(404).json({ message: 'Project not found' })
      return
    }
    res.status(201).json({
      id: created.id,
      projectId: created.projectId,
      filename: created.filename,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      chunkCount: created.chunks.length,
    })
  } catch (error) {
    req.logger.error({ err: error, projectId, userId, filename: file.originalname }, 'failed to upload knowledge file')
    captureRequestException(req, error, { projectId, filename: file.originalname })
    res.status(500).json({ message: 'Knowledge file processing failed' })
  }
}
