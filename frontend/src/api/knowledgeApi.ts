import type { KnowledgeFile, UploadedKnowledgeFile } from '../types/knowledge'
import { authenticatedFetch } from './authenticatedFetch'

export const knowledgeFilesQueryKey = (userId: number | undefined, projectId: number) =>
  ['knowledge-files', userId, projectId] as const

export async function fetchKnowledgeFiles(projectId: number): Promise<KnowledgeFile[]> {
  const response = await authenticatedFetch(`/api/projects/${projectId}/knowledge/files`)
  if (!response.ok) throw new Error('知识库加载失败')
  return response.json() as Promise<KnowledgeFile[]>
}

export async function uploadKnowledgeFile(projectId: number, file: File): Promise<UploadedKnowledgeFile> {
  const body = new FormData()
  body.append('file', file)
  const response = await authenticatedFetch(`/api/projects/${projectId}/knowledge/files`, {
    method: 'POST',
    body,
  })
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(result?.message || '知识文件上传失败')
  }
  return response.json() as Promise<UploadedKnowledgeFile>
}
