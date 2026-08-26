import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  MAX_KNOWLEDGE_FILE_BYTES,
  deleteKnowledgeFileController,
  getKnowledgeFilesController,
  uploadKnowledgeFileController,
} from './knowledge.controller.js'

const knowledgeRouter = Router({ mergeParams: true })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_KNOWLEDGE_FILE_BYTES, files: 1 },
})
const parseKnowledgeFile: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'File must not exceed 60 KB' : 'Invalid file upload' })
      return
    }
    next(error)
  })
}

knowledgeRouter.use(requireAuth)
knowledgeRouter.get('/files', getKnowledgeFilesController)
knowledgeRouter.post('/files', parseKnowledgeFile, uploadKnowledgeFileController)
knowledgeRouter.delete('/files/:fileId', deleteKnowledgeFileController)

export default knowledgeRouter
