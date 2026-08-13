import type { CreateProjectInput, Project } from '../types/project'
import { authenticatedFetch } from './authenticatedFetch'

export const projectsQueryKey = (userId: number | undefined) => ['projects', userId] as const
export const projectQueryKey = (userId: number | undefined, projectId: number) =>
  ['project', userId, projectId] as const

export async function fetchProjects(): Promise<Project[]> {
  const response = await authenticatedFetch('/api/projects')

  if (!response.ok) {
    throw new Error('项目加载失败')
  }

  return response.json() as Promise<Project[]>
}

export async function fetchProject(id: number): Promise<Project> {
  const response = await authenticatedFetch(`/api/projects/${id}`)

  if (!response.ok) {
    throw new Error('项目加载失败')
  }

  return response.json() as Promise<Project>
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await authenticatedFetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('项目创建失败')
  }

  return response.json() as Promise<Project>
}

export async function deleteProject(id: number): Promise<void> {
  const response = await authenticatedFetch(`/api/projects/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error('项目删除失败')
  }
}
