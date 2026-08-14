import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { generateController } from './ai.controller.js'

const aiRouter = Router()

aiRouter.post('/generate', requireAuth, generateController)

export default aiRouter
