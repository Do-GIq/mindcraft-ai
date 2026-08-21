import './instrument.js'
import express from 'express'
import * as Sentry from '@sentry/node'
import cors from 'cors'
import authRouter from './modules/auth/auth.route.js'
import projectRouter from './modules/project/project.route.js'
import documentRouter, { singleDocumentRouter } from './modules/document/document.route.js'
import aiRouter from './modules/ai/ai.route.js'
import statsRouter from './modules/stats/stats.route.js'
import userRouter from './modules/user/user.route.js'
import conversationRouter from './modules/conversation/conversation.route.js'
import { logger } from './lib/logger.js'
import { errorLoggingHandler, globalErrorHandler, notFoundHandler } from './middleware/error.middleware.js'
import { requestContext, requestLogger } from './middleware/request-context.middleware.js'
import { shouldCaptureExpressError } from './lib/sentry.js'

const app = express()

app.use(requestContext)
app.use(requestLogger)
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok'
  })
})

app.use('/api/projects/:projectId/documents', documentRouter)
app.use('/api/documents', singleDocumentRouter)
app.use('/api/projects', projectRouter)
app.use('/api/auth', authRouter)
app.use('/api/ai', aiRouter)
app.use('/api/stats', statsRouter)
app.use('/api/users', userRouter)
app.use('/api/conversations', conversationRouter)
app.use(notFoundHandler)
app.use(errorLoggingHandler)
if (Sentry.isInitialized()) {
  Sentry.setupExpressErrorHandler(app, { shouldHandleError: shouldCaptureExpressError })
}
app.use(globalErrorHandler)

app.listen(3000, () => {
  logger.info({ port: 3000 }, 'server started')
})
