import express from 'express'
import cors from 'cors'
import authRouter from './modules/auth/auth.route.js'
import projectRouter from './modules/project/project.route.js'
import documentRouter from './modules/document/document.route.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok'
  })
})

app.use('/api/projects/:projectId/documents', documentRouter)
app.use('/api/projects', projectRouter)
app.use('/api/auth', authRouter)

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
