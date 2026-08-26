import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  conversationFindFirst: vi.fn(),
}))

vi.mock('../src/db/prisma.js', () => ({
  prisma: {
    conversation: { findFirst: mocks.conversationFindFirst },
  },
}))

import { getRetryConversationContext } from '../src/modules/conversation/conversation.service.js'

describe('conversation retry context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reuses the latest user message without creating another message', async () => {
    mocks.conversationFindFirst.mockResolvedValue({
      id: 8,
      projectId: 3,
      documentId: 5,
      messages: [
        { role: 'USER', content: '继续完善这一段' },
        { role: 'ASSISTANT', content: '上一轮回答' },
        { role: 'USER', content: '第一轮问题' },
      ],
    })

    const result = await getRetryConversationContext(11, 8)

    expect(mocks.conversationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8, userId: 11 },
    }))
    expect(result?.prompt).toBe('继续完善这一段')
    expect(result?.messages).toEqual([
      { role: 'user', content: '第一轮问题' },
      { role: 'assistant', content: '上一轮回答' },
      { role: 'user', content: '继续完善这一段' },
    ])
  })

  it('does not retry when the latest message is not from the user', async () => {
    mocks.conversationFindFirst.mockResolvedValue({
      id: 8,
      projectId: 3,
      documentId: 5,
      messages: [{ role: 'ASSISTANT', content: '已经完成' }],
    })

    const result = await getRetryConversationContext(11, 8)

    expect(result?.prompt).toBeNull()
  })

  it('returns null when the conversation is not owned by the current user', async () => {
    mocks.conversationFindFirst.mockResolvedValue(null)

    await expect(getRetryConversationContext(11, 99)).resolves.toBeNull()
  })
})
