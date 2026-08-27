import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  getProjectsController,
  updateProjectController,
} from './project.controller.js'

const projectRouter = Router()

projectRouter.use(requireAuth)
projectRouter.get('/', getProjectsController)
projectRouter.get('/:id', getProjectController)
projectRouter.post('/', createProjectController)
projectRouter.patch('/:id', updateProjectController)
projectRouter.delete('/:id', deleteProjectController)

export default projectRouter
