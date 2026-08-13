import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { createDocumentController, getDocumentsController } from './document.controller.js'

const documentRouter = Router({ mergeParams: true })

documentRouter.use(requireAuth)
documentRouter.get('/', getDocumentsController)
documentRouter.post('/', createDocumentController)

export default documentRouter
