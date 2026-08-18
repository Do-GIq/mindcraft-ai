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

export function getOwnedDocument(userId: number, id: number) {
  return prisma.document.findFirst({
    where: { id, project: { userId } },
  })
}

type UpdateDocumentInput = {
  title?: string
  content?: string
}

export function updateDocument(id: number, data: UpdateDocumentInput) {
  return prisma.document.update({ where: { id }, data })
}

export type DocumentVersionSource = 'AUTO' | 'MANUAL' | 'RESTORE'

type VersionSnapshot = {
  title: string
  content: string
}

const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000
const MAX_VERSIONS_PER_DOCUMENT = 30

export function getDocumentVersions(userId: number, documentId: number) {
  return prisma.documentVersion.findMany({
    where: { documentId, document: { project: { userId } } },
    select: { id: true, title: true, source: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export function getDocumentVersion(userId: number, documentId: number, versionId: number) {
  return prisma.documentVersion.findFirst({
    where: { id: versionId, documentId, document: { project: { userId } } },
    select: { id: true, documentId: true, title: true, content: true, source: true, createdAt: true },
  })
}

export async function createDocumentVersion(
  userId: number,
  documentId: number,
  source: DocumentVersionSource,
  requestedSnapshot?: VersionSnapshot,
) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.document.findFirst({
      where: { id: documentId, project: { userId } },
      select: { id: true, title: true, content: true },
    })
    if (!document) return { status: 'not_found' as const }

    const snapshot = requestedSnapshot ?? document
    const latest = await tx.documentVersion.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true },
    })
    if (latest?.title === snapshot.title && latest.content === snapshot.content) {
      return { status: 'duplicate' as const }
    }

    if (source === 'AUTO') {
      const latestAuto = await tx.documentVersion.findFirst({
        where: { documentId, source: 'AUTO' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      if (latestAuto && Date.now() - latestAuto.createdAt.getTime() < AUTO_VERSION_INTERVAL_MS) {
        return { status: 'rate_limited' as const }
      }
    }

    const version = await tx.documentVersion.create({
      data: { documentId, title: snapshot.title, content: snapshot.content, source },
      select: { id: true, title: true, source: true, createdAt: true },
    })
    const expired = await tx.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_VERSIONS_PER_DOCUMENT,
      select: { id: true },
    })
    if (expired.length > 0) {
      await tx.documentVersion.deleteMany({ where: { id: { in: expired.map(({ id }) => id) } } })
    }

    return { status: 'created' as const, version }
  })
}

export async function restoreDocumentVersion(userId: number, documentId: number, versionId: number) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.documentVersion.findFirst({
      where: { id: versionId, documentId, document: { project: { userId } } },
      select: { title: true, content: true },
    })
    if (!version) return { status: 'not_found' as const }

    const current = await tx.document.findFirst({
      where: { id: documentId, project: { userId } },
    })
    if (!current) return { status: 'not_found' as const }
    if (current.title === version.title && current.content === version.content) {
      return { status: 'unchanged' as const, document: current }
    }

    const latest = await tx.documentVersion.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true },
    })
    if (latest?.title !== current.title || latest.content !== current.content) {
      await tx.documentVersion.create({
        data: { documentId, title: current.title, content: current.content, source: 'RESTORE' },
      })
    }

    const document = await tx.document.update({
      where: { id: documentId },
      data: { title: version.title, content: version.content },
    })
    const expired = await tx.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_VERSIONS_PER_DOCUMENT,
      select: { id: true },
    })
    if (expired.length > 0) {
      await tx.documentVersion.deleteMany({ where: { id: { in: expired.map(({ id }) => id) } } })
    }

    return { status: 'restored' as const, document }
  })
}
