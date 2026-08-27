import { prisma } from '../../db/prisma.js'
import { deleteProjectKnowledgePoints } from '../knowledge/knowledge.service.js'

type CreateProjectInput = {
  title: string
  type?: string
  description?: string
}

export type UpdateProjectInput = {
  title?: string
  type?: 'GENERAL' | 'RAG'
  description?: string | null
}

export function getProjects(userId: number) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export function getProject(userId: number, id: number) {
  return prisma.project.findFirst({ where: { id, userId } })
}

export function createProject(userId: number, data: CreateProjectInput) {
  return prisma.project.create({ data: { ...data, userId } })
}

export async function updateProject(userId: number, id: number, data: UpdateProjectInput) {
  const updated = await prisma.project.updateMany({ where: { id, userId }, data })
  if (updated.count === 0) return null
  return prisma.project.findFirst({ where: { id, userId } })
}

export async function deleteProject(userId: number, id: number) {
  const project = await prisma.project.findFirst({ where: { id, userId }, select: { id: true } })
  if (!project) return false

  await deleteProjectKnowledgePoints(userId, id)
  const result = await prisma.project.deleteMany({ where: { id, userId } })
  return result.count > 0
}
