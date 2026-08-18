import type {
  CreateDocumentInput,
  CreateDocumentVersionResult,
  Document,
  DocumentVersion,
  DocumentVersionSource,
  DocumentVersionSummary,
  RestoreDocumentVersionResult,
  UpdateDocumentInput,
} from '../types/document'
import { authenticatedFetch } from './authenticatedFetch'

export const documentsQueryKey = (
  userId: number | undefined,
  projectId: number,
) => ['documents', userId, projectId] as const

export const documentQueryKey = (userId: number | undefined, documentId: number) =>
  ['document', userId, documentId] as const

export const documentVersionsQueryKey = (userId: number | undefined, documentId: number) =>
  ['document-versions', userId, documentId] as const

export class DocumentApiError extends Error {
  status: number

  constructor(status: number) {
    super('Document request failed')
    this.status = status
  }
}

export async function fetchDocuments(projectId: number): Promise<Document[]> {
  const response = await authenticatedFetch(`/api/projects/${projectId}/documents`)

  if (!response.ok) {
    throw new Error('文档加载失败')
  }

  return response.json() as Promise<Document[]>
}

export async function createDocument(
  projectId: number,
  input: CreateDocumentInput,
): Promise<Document> {
  const response = await authenticatedFetch(`/api/projects/${projectId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('文档创建失败')
  }

  return response.json() as Promise<Document>
}

export async function fetchDocument(id: number): Promise<Document> {
  const response = await authenticatedFetch(`/api/documents/${id}`)
  if (!response.ok) throw new DocumentApiError(response.status)
  return response.json() as Promise<Document>
}

export async function updateDocument(id: number, input: UpdateDocumentInput): Promise<Document> {
  const response = await authenticatedFetch(`/api/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new DocumentApiError(response.status)
  return response.json() as Promise<Document>
}

export async function fetchDocumentVersions(id: number): Promise<DocumentVersionSummary[]> {
  const response = await authenticatedFetch(`/api/documents/${id}/versions`)
  if (!response.ok) throw new DocumentApiError(response.status)
  return response.json() as Promise<DocumentVersionSummary[]>
}

export async function fetchDocumentVersion(id: number, versionId: number): Promise<DocumentVersion> {
  const response = await authenticatedFetch(`/api/documents/${id}/versions/${versionId}`)
  if (!response.ok) throw new DocumentApiError(response.status)
  return response.json() as Promise<DocumentVersion>
}

export async function createDocumentVersion(
  id: number,
  source: Exclude<DocumentVersionSource, 'RESTORE'>,
  snapshot?: { title: string; content: string },
): Promise<CreateDocumentVersionResult> {
  const response = await authenticatedFetch(`/api/documents/${id}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, ...snapshot }),
  })
  if (!response.ok) throw new DocumentApiError(response.status)
  return response.json() as Promise<CreateDocumentVersionResult>
}

export async function restoreDocumentVersion(
  id: number,
  versionId: number,
): Promise<RestoreDocumentVersionResult> {
  const response = await authenticatedFetch(`/api/documents/${id}/versions/${versionId}/restore`, {
    method: 'POST',
  })
  if (!response.ok) throw new DocumentApiError(response.status)
  return response.json() as Promise<RestoreDocumentVersionResult>
}
