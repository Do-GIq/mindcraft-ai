export type KnowledgeFile = {
  id: number
  projectId: number
  filename: string
  createdAt: string
  updatedAt: string
  _count: { chunks: number }
}

export type UploadedKnowledgeFile = Omit<KnowledgeFile, '_count'> & {
  chunkCount: number
}
