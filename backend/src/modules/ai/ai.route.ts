import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { generateController } from './ai.controller.js'
import { aiRateLimiter } from '../../middleware/rate-limit.middleware.js'

const aiRouter = Router()

aiRouter.post('/generate', requireAuth, aiRateLimiter, generateController)

export default aiRouter
