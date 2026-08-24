import { randomUUID } from 'node:crypto'
import { prisma } from '../../db/prisma.js'
import { createEmbedding } from './embedding.service.js'
import {
  deleteKnowledgePoints,
  queryKnowledgePoints,
  upsertKnowledgePoints,
  type KnowledgeVectorPoint,
} from './qdrant.service.js'

const CHUNK_SIZE = 1_200
const RETRIEVAL_LIMIT = 5

export function splitKnowledgeContent(content: string) {
  const characters = Array.from(content)
  const chunks: string[] = []
  for (let index = 0; index < characters.length; index += CHUNK_SIZE) {
    chunks.push(characters.slice(index, index + CHUNK_SIZE).join(''))
  }
  return chunks
}

export async function getKnowledgeFiles(userId: number, projectId: number) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
  if (!project) return null
  return prisma.knowledgeFile.findMany({
    where: { userId, projectId },
    select: {
      id: true,
      projectId: true,
      filename: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createKnowledgeFile(input: {
  userId: number
  projectId: number
  filename: string
  content: string
}) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: input.userId },
    select: { id: true },
  })
  if (!project) return null

  const chunks = splitKnowledgeContent(input.content)
  const vectorIds = chunks.map(() => randomUUID())
  const { file, storedChunks } = await prisma.$transaction(async (tx) => {
    const file = await tx.knowledgeFile.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        filename: input.filename,
        content: input.content,
      },
    })
    await tx.knowledgeChunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        knowledgeFileId: file.id,
        content,
        chunkIndex,
        vectorId: vectorIds[chunkIndex] ?? randomUUID(),
      })),
    })
    const storedChunks = await tx.knowledgeChunk.findMany({
      where: { knowledgeFileId: file.id },
      orderBy: { chunkIndex: 'asc' },
    })
    return { file, storedChunks }
  })

  try {
    const points: KnowledgeVectorPoint[] = []
    for (const chunk of storedChunks) {
      points.push({
        id: chunk.vectorId,
        vector: await createEmbedding(chunk.content),
        payload: { projectId: input.projectId, knowledgeFileId: file.id, chunkId: chunk.id },
      })
    }
    await upsertKnowledgePoints(points)
    return { ...file, chunks: storedChunks }
  } catch (error) {
    await prisma.knowledgeFile.delete({ where: { id: file.id } })
    try { await deleteKnowledgePoints(vectorIds) } catch { /* Best-effort vector cleanup. */ }
    throw error
  }
}

export async function retrieveProjectKnowledge(userId: number, projectId: number, query: string) {
  const ownedProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
  if (!ownedProject) return []

  const fileCount = await prisma.knowledgeFile.count({ where: { projectId, userId } })
  if (fileCount === 0) return []

  const vector = await createEmbedding(query)
  const points = await queryKnowledgePoints(projectId, vector, RETRIEVAL_LIMIT)
  const chunkIds = points
    .map((point) => point.payload?.chunkId)
    .filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
  if (chunkIds.length === 0) return []

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      id: { in: chunkIds },
      knowledgeFile: { projectId, userId },
    },
    select: { id: true, content: true },
  })
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk.content]))
  return chunkIds.map((id) => byId.get(id)).filter((content): content is string => Boolean(content))
}
