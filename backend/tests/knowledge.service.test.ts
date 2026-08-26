import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  projectFindFirst: vi.fn(),
  knowledgeFileFindFirst: vi.fn(),
  knowledgeFileCount: vi.fn(),
  knowledgeFileDelete: vi.fn(),
  knowledgeChunkFindMany: vi.fn(),
  transaction: vi.fn(),
  createEmbedding: vi.fn(),
  upsertKnowledgePoints: vi.fn(),
  deleteKnowledgePoints: vi.fn(),
  queryKnowledgePoints: vi.fn(),
}))

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    project: { findFirst: mocks.projectFindFirst },
    knowledgeFile: {
      findFirst: mocks.knowledgeFileFindFirst,
      count: mocks.knowledgeFileCount,
      delete: mocks.knowledgeFileDelete,
    },
    knowledgeChunk: { findMany: mocks.knowledgeChunkFindMany },
    $transaction: mocks.transaction,
  },
}))

vi.mock('../src/modules/knowledge/embedding.service.js', () => ({
  createEmbedding: mocks.createEmbedding,
}))

vi.mock('../src/modules/knowledge/qdrant.service.js', () => ({
  upsertKnowledgePoints: mocks.upsertKnowledgePoints,
  deleteKnowledgePoints: mocks.deleteKnowledgePoints,
  queryKnowledgePoints: mocks.queryKnowledgePoints,
}))

import {
  createKnowledgeFile,
  getKnowledgeCitationSources,
  retrieveProjectKnowledge,
} from '../src/modules/knowledge/knowledge.service.js'

describe('knowledge service boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads an owned knowledge file and writes chunk vectors with scoped payloads', async () => {
    const createdAt = new Date('2026-08-24T00:00:00.000Z')
    const file = {
      id: 7,
      projectId: 3,
      userId: 11,
      filename: 'brief.md',
      content: '项目知识',
      createdAt,
      updatedAt: createdAt,
    }
    const storedChunks = [{
      id: 19,
      knowledgeFileId: file.id,
      content: file.content,
      chunkIndex: 0,
      vectorId: 'vector-19',
      createdAt,
    }]
    const transactionClient = {
      knowledgeFile: { create: vi.fn().mockResolvedValue(file) },
      knowledgeChunk: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue(storedChunks),
      },
    }

    mocks.projectFindFirst.mockResolvedValue({ id: 3 })
    mocks.knowledgeFileFindFirst.mockResolvedValue(null)
    mocks.transaction.mockImplementation(async (
      callback: (client: typeof transactionClient) => Promise<unknown>,
    ) => callback(transactionClient))
    mocks.createEmbedding.mockResolvedValue([0.1, 0.2])
    mocks.upsertKnowledgePoints.mockResolvedValue(undefined)

    const result = await createKnowledgeFile({
      userId: 11,
      projectId: 3,
      filename: file.filename,
      content: file.content,
    })

    expect(result.status).toBe('created')
    expect(mocks.createEmbedding).toHaveBeenCalledWith(file.content)
    expect(mocks.upsertKnowledgePoints).toHaveBeenCalledOnce()
    expect(mocks.upsertKnowledgePoints.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        vector: [0.1, 0.2],
        payload: { projectId: 3, knowledgeFileId: 7, chunkId: 19 },
      }),
    ])
  })

  it('rejects upload before embedding when the project is not owned', async () => {
    mocks.projectFindFirst.mockResolvedValue(null)

    const result = await createKnowledgeFile({
      userId: 11,
      projectId: 99,
      filename: 'foreign.md',
      content: '不可访问',
    })

    expect(result).toEqual({ status: 'not_found' })
    expect(mocks.createEmbedding).not.toHaveBeenCalled()
    expect(mocks.upsertKnowledgePoints).not.toHaveBeenCalled()
  })

  it('filters foreign Qdrant chunk ids through MySQL ownership and preserves scores', async () => {
    mocks.projectFindFirst.mockResolvedValue({ id: 3 })
    mocks.knowledgeFileCount.mockResolvedValue(1)
    mocks.createEmbedding.mockResolvedValue([0.1, 0.2])
    mocks.queryKnowledgePoints.mockResolvedValue([
      { payload: { projectId: 3, knowledgeFileId: 7, chunkId: 19 }, score: 0.92 },
      { payload: { projectId: 999, knowledgeFileId: 88, chunkId: 999 }, score: 0.99 },
      { payload: { projectId: 3, knowledgeFileId: 7, chunkId: 20 }, score: 0.84 },
    ])
    mocks.knowledgeChunkFindMany.mockResolvedValue([
      { id: 19, content: '第一段', chunkIndex: 0, knowledgeFile: { id: 7, filename: 'brief.md' } },
      { id: 20, content: '第二段', chunkIndex: 1, knowledgeFile: { id: 7, filename: 'brief.md' } },
    ])

    const chunks = await retrieveProjectKnowledge(11, 3, '项目是什么？')

    expect(mocks.queryKnowledgePoints).toHaveBeenCalledWith(3, [0.1, 0.2], 5)
    expect(mocks.knowledgeChunkFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: [19, 999, 20] },
        knowledgeFile: { projectId: 3, userId: 11 },
      },
    }))
    expect(chunks.map((chunk) => chunk.chunkId)).toEqual([19, 20])
    expect(chunks.map((chunk) => chunk.score)).toEqual([0.92, 0.84])
    expect(chunks.some((chunk) => chunk.chunkId === 999)).toBe(false)
  })

  it('deduplicates citations by validated knowledge file while retaining multiple context chunks', () => {
    const chunks = [
      { chunkId: 19, content: '第一段', chunkIndex: 0, knowledgeFileId: 7, filename: 'brief.md', score: 0.92 },
      { chunkId: 20, content: '第二段', chunkIndex: 1, knowledgeFileId: 7, filename: 'brief.md', score: 0.84 },
      { chunkId: 21, content: '另一文件', chunkIndex: 0, knowledgeFileId: 8, filename: 'notes.txt', score: null },
    ]

    expect(chunks).toHaveLength(3)
    expect(getKnowledgeCitationSources(chunks)).toEqual([
      { fileId: 7, filename: 'brief.md' },
      { fileId: 8, filename: 'notes.txt' },
    ])
  })
})
