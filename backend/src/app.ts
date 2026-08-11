import express from 'express'
import cors from 'cors'
import projectRouter from './modules/project/project.route.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok'
  })
})

app.use('/api/projects', projectRouter)

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
