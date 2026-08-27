import { describe, expect, it } from 'vitest'
import { buildKnowledgeAnswerRoute } from '../src/modules/ai/ai-grounding.js'

const history = [
  { role: 'user' as const, content: '项目的限流是多少？' },
  { role: 'assistant' as const, content: '旧回答声称来自 MindCraft AI 知识库验收文档。' },
]

describe('AI knowledge answer routing', () => {
  it('uses grounded instructions when validated retrieval contains chunks', () => {
    const route = buildKnowledgeAnswerRoute(history, [{
      content: 'AI Generate 每用户每 10 分钟 20 次。',
      knowledgeFileId: 7,
      filename: 'mindcraft-rag-e2e-test.md',
    }])

    expect(route.grounded).toBe(true)
    expect(route.modelInput[0]?.content).toContain('当前 Project Knowledge')
    expect(route.modelInput[0]?.content).toContain('不得编造')
  })

  it('uses ungrounded instructions when retrieval is empty', () => {
    const route = buildKnowledgeAnswerRoute(history, [], 'AI Generate 的限流是多少？')

    expect(route.grounded).toBe(false)
    expect(route.modelInput[0]?.content).toContain('没有任何经过验证的当前 Project Knowledge retrieval result')
    expect(route.modelInput[0]?.content).toContain('不得声称回答来自知识库')
    expect(route.modelInput[0]?.content).toContain('不得猜测具体值')
    expect(route.modelInput[0]?.content).toContain('AI Generate 的限流是多少')
    expect(route.projectPrivateQuestion).toBe(true)
  })

  it('does not treat document names in conversation history as grounding', () => {
    const route = buildKnowledgeAnswerRoute(history, [], 'AI Generate 的限流是多少？')

    expect(route.grounded).toBe(false)
    expect(route.modelInput[0]?.content).toContain('Conversation history 只是对话历史')
    expect(route.modelInput.some((message) => message.content.includes('MindCraft AI 知识库验收文档'))).toBe(false)
    expect(route.modelInput.some((message) => message.content.includes('历史 Assistant 回答已省略'))).toBe(true)
  })

  it('creates project citations only from current retrieval chunks', () => {
    const ungrounded = buildKnowledgeAnswerRoute(history, [], 'AI Generate 的限流是多少？')
    const grounded = buildKnowledgeAnswerRoute(history, [
      { content: '第一段', knowledgeFileId: 7, filename: 'source.md' },
      { content: '第二段', knowledgeFileId: 7, filename: 'source.md' },
    ])

    expect(ungrounded.sources).toEqual([])
    expect(grounded.sources).toEqual([{ fileId: 7, filename: 'source.md' }])
  })

  it('keeps full conversation history for ungrounded general questions', () => {
    const route = buildKnowledgeAnswerRoute(history, [], 'JWT 和 Session 有什么区别？')

    expect(route.projectPrivateQuestion).toBe(false)
    expect(route.modelInput.slice(1)).toEqual(history)
  })
})
