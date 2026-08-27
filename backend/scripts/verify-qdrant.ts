import 'dotenv/config'
import {
  ensureKnowledgeCollection,
  getKnowledgeCollectionStatus,
} from '../src/modules/knowledge/qdrant.service.js'

const result = await ensureKnowledgeCollection()
const status = await getKnowledgeCollectionStatus()
const valid = status.connected
  && status.exists
  && status.vectorSize === 1_024
  && status.distance?.toLowerCase() === 'cosine'
  && status.projectIdIndexType?.toLowerCase() === 'integer'

console.log(JSON.stringify({
  initialization: result,
  connected: status.connected,
  collectionExists: status.exists,
  vectorSize: status.vectorSize,
  distance: status.distance,
  projectIdIndexType: status.projectIdIndexType,
  valid,
}))

if (!valid) process.exitCode = 1
