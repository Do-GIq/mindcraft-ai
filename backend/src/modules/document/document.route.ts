import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createDocumentController,
  createDocumentVersionController,
  getDocumentController,
  getDocumentVersionController,
  getDocumentVersionsController,
  getDocumentsController,
  restoreDocumentVersionController,
  updateDocumentController,
} from './document.controller.js'

const documentRouter = Router({ mergeParams: true })

documentRouter.use(requireAuth)
documentRouter.get('/', getDocumentsController)
documentRouter.post('/', createDocumentController)

export default documentRouter

export const singleDocumentRouter = Router()

singleDocumentRouter.use(requireAuth)
singleDocumentRouter.get('/:id/versions', getDocumentVersionsController)
singleDocumentRouter.post('/:id/versions', createDocumentVersionController)
singleDocumentRouter.get('/:id/versions/:versionId', getDocumentVersionController)
singleDocumentRouter.post('/:id/versions/:versionId/restore', restoreDocumentVersionController)
singleDocumentRouter.get('/:id', getDocumentController)
singleDocumentRouter.patch('/:id', updateDocumentController)
