import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createDocumentController,
  getDocumentController,
  getDocumentsController,
  updateDocumentController,
} from './document.controller.js'

const documentRouter = Router({ mergeParams: true })

documentRouter.use(requireAuth)
documentRouter.get('/', getDocumentsController)
documentRouter.post('/', createDocumentController)

export default documentRouter

export const singleDocumentRouter = Router()

singleDocumentRouter.use(requireAuth)
singleDocumentRouter.get('/:id', getDocumentController)
singleDocumentRouter.patch('/:id', updateDocumentController)
