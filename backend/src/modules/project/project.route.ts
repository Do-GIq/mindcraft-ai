import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createProjectController,
  deleteProjectController,
  getProjectsController,
} from './project.controller.js'

const projectRouter = Router()

projectRouter.use(requireAuth)
projectRouter.get('/', getProjectsController)
projectRouter.post('/', createProjectController)
projectRouter.delete('/:id', deleteProjectController)

export default projectRouter
