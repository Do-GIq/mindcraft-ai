export type Project = {
  id: number
  title: string
  type: string
  description: string | null
  progress: number
  createdAt: string
  updatedAt: string
}

export type CreateProjectInput = {
  title: string
  type?: string
  description?: string
}

export type ProjectType = 'GENERAL' | 'RAG'

export type UpdateProjectInput = {
  title?: string
  type?: ProjectType
  description?: string
}
