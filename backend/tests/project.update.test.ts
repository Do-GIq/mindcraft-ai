import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findFirst: vi.fn(),
}))

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    project: {
      updateMany: mocks.updateMany,
      findFirst: mocks.findFirst,
    },
  },
}))

import { parseProjectUpdateBody } from '../src/modules/project/project.controller.js'
import { updateProject } from '../src/modules/project/project.service.js'

describe('project update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows the owner to update title, description and type', async () => {
    const data = { title: '新标题', description: '新描述', type: 'RAG' as const }
    const updatedProject = { id: 3, userId: 11, ...data }
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.findFirst.mockResolvedValue(updatedProject)

    await expect(updateProject(11, 3, data)).resolves.toEqual(updatedProject)
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 3, userId: 11 }, data })
  })

  it('rejects an empty title', () => {
    expect(parseProjectUpdateBody({ title: '   ' })).toEqual({ ok: false, message: 'Title is required' })
  })

  it('rejects an unsupported type', () => {
    expect(parseProjectUpdateBody({ type: 'CUSTOM' })).toEqual({ ok: false, message: 'Invalid project type' })
  })

  it('does not update a project owned by another user', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    await expect(updateProject(11, 99, { title: '越权修改' })).resolves.toBeNull()
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 99, userId: 11 }, data: { title: '越权修改' } })
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })

  it('keeps partial PATCH data limited to explicitly provided fields', () => {
    expect(parseProjectUpdateBody({ description: '  只更新描述  ' })).toEqual({
      ok: true,
      data: { description: '只更新描述' },
    })
  })
})
