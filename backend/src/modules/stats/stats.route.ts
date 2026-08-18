import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getDashboardStatsController, getOverviewStatsController } from './stats.controller.js'

const statsRouter = Router()

statsRouter.use(requireAuth)
statsRouter.get('/overview', getOverviewStatsController)
statsRouter.get('/dashboard', getDashboardStatsController)

export default statsRouter
