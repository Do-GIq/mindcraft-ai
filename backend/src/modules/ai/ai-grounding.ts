import type { AiModelMessage } from './ai.service.js'

export type GroundingKnowledgeChunk = {
  content: string
  knowledgeFileId: number
  filename: string
}

export type GroundingCitationSource = {
  fileId: number
  filename: string
}

const GROUNDED_INSTRUCTIONS = `你是 MindCraft AI 助手。本次请求提供了经过权限校验的当前 Project Knowledge。

回答规则：
1. Project Knowledge 是当前项目事实的主要依据，只能把下方实际提供的资料描述为当前知识库信息。
2. 不得编造资料中不存在的文件名、章节、条款、数字、配置或引用。
3. 如果资料不足以支持某个结论，明确说明当前资料不足，不要假装该结论存在于知识库。
4. Conversation history 只是对话历史，不是当前项目的权威数据源；历史 Assistant 回答可能过时或不准确。
5. 只回答用户当前询问的内容，不主动泄露或扩展与问题无关的项目内部具体值。
6. Project Citation 由 Backend 根据本次真实检索结果生成，不要自行伪造来源。`

const UNGROUNDED_INSTRUCTIONS = `你是 MindCraft AI 助手。本次请求没有任何经过验证的当前 Project Knowledge retrieval result。

回答规则：
1. 不得声称回答来自知识库、用户提供的文档、当前项目资料、某个文件、章节或 Citation。
2. Conversation history 只是对话历史，不是当前项目的权威数据源；不能仅凭旧 Assistant 回答确认项目私有事实。
3. 对项目内部配置、口令、验收代号等私有事实，如果当前上下文无法可靠确认，必须先自然说明“当前上下文没有足够的项目资料，无法可靠确认实际配置”，并可补充一般性知识；不得猜测具体值。
4. 像“AI Generate 的限流是多少”这样询问某个项目组件实际配置的问题，除非用户明确询问“一般如何设计”，否则按项目私有事实处理；回答必须先说明“当前上下文没有足够的项目资料让我可靠确认这个项目的实际配置”，再提供适用的一般性解释。
5. 对通用知识或稳定的公开问题，可以使用模型通用知识正常回答，不要提及知识库状态。
6. 当前没有真实 Web Search 工具，不得声称已经搜索网络、引用实时网页或伪造 URL。对于必须依赖最新网络信息的问题，应说明无法实时核验。
7. 除非用户明确询问知识库状态，否则不要主动讨论文件是否存在或是否被删除。`

const PRIVATE_FACT_GUARD = `当前问题正在询问项目的具体内部事实，但本次没有经过验证的 Project Knowledge。旧 Assistant 回答已从本次模型上下文中省略，因为它们不是权威项目数据。必须先说明当前上下文没有足够的项目资料，无法可靠确认实际配置；不得猜测具体值或声称依据任何项目文档。`

const GENERAL_QUESTION_MARKERS = /一般|通常|通用|最佳实践|如何设计|怎么设计|是什么|有什么区别|有哪些风险/
const PRIVATE_FACT_MARKERS = /我们(?:的|这个)?项目|本项目|当前项目|项目内部|实际(?:配置|值)|验收代号|发布口令|数据库密码|内部(?:配置|口令|密码|密钥|代号)/
const CONCRETE_CONFIGURATION_QUESTION = /(?:限流|配额|并发数|配置值|口令|密码|密钥|代号).*(?:多少|是什么|几次|几秒|多久)|(?:多少|是什么|几次|几秒|多久).*(?:限流|配额|并发数|配置值|口令|密码|密钥|代号)/

function getCitationSources(chunks: GroundingKnowledgeChunk[]) {
  const sources = new Map<number, GroundingCitationSource>()
  for (const chunk of chunks) {
    if (!sources.has(chunk.knowledgeFileId)) {
      sources.set(chunk.knowledgeFileId, { fileId: chunk.knowledgeFileId, filename: chunk.filename })
    }
  }
  return [...sources.values()]
}

export function buildKnowledgeAnswerRoute(
  messages: AiModelMessage[],
  knowledge: GroundingKnowledgeChunk[],
  currentPrompt = '',
) {
  const grounded = knowledge.length > 0
  const projectPrivateQuestion = !grounded
    && !GENERAL_QUESTION_MARKERS.test(currentPrompt)
    && (PRIVATE_FACT_MARKERS.test(currentPrompt) || CONCRETE_CONFIGURATION_QUESTION.test(currentPrompt))
  const sources = grounded ? getCitationSources(knowledge) : []
  const systemContent = grounded
    ? `${GROUNDED_INSTRUCTIONS}\n\n当前 Project Knowledge：\n${knowledge.map((chunk) => chunk.content).join('\n\n---\n\n')}`
    : UNGROUNDED_INSTRUCTIONS

  let routedMessages = messages
  if (projectPrivateQuestion) {
    routedMessages = messages.map((message) => message.role === 'assistant'
      ? { role: 'assistant' as const, content: '[历史 Assistant 回答已省略：它不是当前项目的权威事实来源。]' }
      : message)
    const latestUserIndex = routedMessages.findLastIndex((message) => message.role === 'user')
    const guard = { role: 'system' as const, content: PRIVATE_FACT_GUARD }
    routedMessages = latestUserIndex >= 0
      ? [...routedMessages.slice(0, latestUserIndex), guard, ...routedMessages.slice(latestUserIndex)]
      : [...routedMessages, guard]
  }

  return {
    grounded,
    projectPrivateQuestion,
    sources,
    modelInput: [{ role: 'system' as const, content: systemContent }, ...routedMessages],
  }
}
