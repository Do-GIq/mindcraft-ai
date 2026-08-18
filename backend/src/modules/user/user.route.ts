import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  changeCurrentUserPasswordController,
  updateCurrentUserController,
} from './user.controller.js'

const userRouter = Router()

userRouter.use(requireAuth)
userRouter.patch('/me', updateCurrentUserController)
userRouter.patch('/me/password', changeCurrentUserPasswordController)

export default userRouter
