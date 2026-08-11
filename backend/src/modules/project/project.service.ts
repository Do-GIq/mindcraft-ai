import { prisma } from '../../db/prisma.js'

type CreateProjectInput = {
  title: string
  type?: string
  description?: string
}

export function getProjects() {
  return prisma.project.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

export function createProject(data: CreateProjectInput) {
  return prisma.project.create({ data })
}

export async function deleteProject(id: number) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!project) {
    return false
  }

  await prisma.project.delete({ where: { id } })
  return true
}
