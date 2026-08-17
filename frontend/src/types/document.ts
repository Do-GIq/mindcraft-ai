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

export type DocumentVersionSource = 'AUTO' | 'MANUAL' | 'RESTORE'

export type DocumentVersionSummary = {
  id: number
  title: string
  source: DocumentVersionSource
  createdAt: string
}

export type DocumentVersion = DocumentVersionSummary & {
  documentId: number
  content: string
}

export type CreateDocumentVersionResult = {
  status: 'created' | 'duplicate' | 'rate_limited'
  version?: DocumentVersionSummary
}

export type RestoreDocumentVersionResult = {
  status: 'restored' | 'unchanged'
  document: Document
}
