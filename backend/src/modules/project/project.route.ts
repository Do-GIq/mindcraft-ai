import { Router } from 'express'
import {
  createProjectController,
  deleteProjectController,
  getProjectsController,
} from './project.controller.js'

const projectRouter = Router()

projectRouter.get('/', getProjectsController)
projectRouter.post('/', createProjectController)
projectRouter.delete('/:id', deleteProjectController)

export default projectRouter
