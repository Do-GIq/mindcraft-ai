export type Document = {
  id: number
  title: string
  content: string
  projectId: number
  createdAt: string
  updatedAt: string
}

export type CreateDocumentInput = {
  title?: string
}

export type UpdateDocumentInput = {
  title?: string
  content?: string
}
