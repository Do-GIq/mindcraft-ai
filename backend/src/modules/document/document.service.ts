import { prisma } from '../../db/prisma.js'

export function findOwnedProject(userId: number, projectId: number) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
}

export function getDocuments(projectId: number) {
  return prisma.document.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
  })
}

export function createDocument(projectId: number, title: string) {
  return prisma.document.create({
    data: { projectId, title, content: '' },
  })
}
