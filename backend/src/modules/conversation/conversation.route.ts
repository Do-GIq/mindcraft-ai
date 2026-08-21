import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createConversationController,
  deleteConversationController,
  getConversationController,
  getConversationsController,
} from './conversation.controller.js'

const conversationRouter = Router()

conversationRouter.use(requireAuth)
conversationRouter.get('/', getConversationsController)
conversationRouter.post('/', createConversationController)
conversationRouter.get('/:id', getConversationController)
conversationRouter.delete('/:id', deleteConversationController)

export default conversationRouter
