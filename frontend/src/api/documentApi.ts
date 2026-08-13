import type { CreateDocumentInput, Document } from '../types/document'
import { authenticatedFetch } from './authenticatedFetch'

export const documentsQueryKey = (
  userId: number | undefined,
  projectId: number,
) => ['documents', userId, projectId] as const

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
