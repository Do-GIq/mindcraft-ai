import { Router } from 'express'
import { loginController, meController, registerController } from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'
import { authRateLimiter } from '../../middleware/rate-limit.middleware.js'

const authRouter = Router()

authRouter.post('/register', authRateLimiter, registerController)
authRouter.post('/login', authRateLimiter, loginController)
authRouter.get('/me', requireAuth, meController)

export default authRouter
