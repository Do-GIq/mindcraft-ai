import { prisma } from '../../db/prisma.js'

type CreateProjectInput = {
  title: string
  type?: string
  description?: string
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

export async function deleteProject(userId: number, id: number) {
  const result = await prisma.project.deleteMany({ where: { id, userId } })
  return result.count > 0
}
