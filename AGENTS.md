# MindCraft AI Agent Guide

本文件是 Codex / AI Coding Agent 修改本仓库前必须读取的项目上下文与开发规则。代码、Prisma schema、package scripts 和现有测试是最终事实来源；若本文件与代码不一致，应先报告差异并以当前代码为准。

## 1. Project Overview

MindCraft AI V1.0 是一个以 Project 为上下文边界的 AI 写作与内容管理工作区。核心能力已完成，包括 Project / Document、Tiptap 编辑器与自动保存、版本历史、多轮 Conversation、SSE 流式生成、Project Knowledge、Embedding、Qdrant RAG、后端来源引用、统计与设置。

当前阶段是在稳定 V1.0 上做明确、增量的维护或增强，不是重新搭建基础架构。不要把已实现能力写成 TODO，也不要提前开发用户未要求的下一阶段功能。

## 2. Repository Structure

- `frontend/`: React + TypeScript + Vite 应用。
  - `src/pages/`: Overview、Projects、Project Workspace、Document Editor、Statistics、Settings、Auth 页面。
  - `src/components/`: Project Knowledge、Scoped Conversation Chat、Editor、图表和通用 UI。
  - `src/api/`, `src/hooks/`, `src/stores/`, `src/lib/`: API 封装、流式生成与 autosave hooks、Zustand auth、Markdown/Sentry 等基础能力。
- `backend/`: Node.js + Express + TypeScript ESM API。
  - `src/modules/`: `auth`, `project`, `document`, `conversation`, `ai`, `knowledge`, `stats`, `user`。
  - `src/modules/knowledge/`: Knowledge 生命周期、Embedding 和 Qdrant service。
  - `src/middleware/`, `src/lib/`, `src/config/`: 鉴权外的请求上下文、日志、限流、全局错误、Sentry、环境校验。
  - `prisma/schema.prisma`, `prisma/migrations/`: 当前数据模型及不可重写的迁移历史。
  - `src/generated/prisma/`: Prisma 生成代码，不要手工编辑。
- `.github/workflows/ci.yml`: 面向 `main` 的 Backend / Frontend CI。

## 3. Current Architecture

### Frontend

- React 19、TypeScript、Vite、React Router。
- TanStack Query 管理服务端数据与缓存；Zustand 保存认证状态。
- Tiptap 保存和读取 HTML；AI 消息使用 Markdown 展示与 Markdown -> HTML 插入。
- `/ai` 只重定向到 `/projects`，全局一级导航仅保留概览、我的项目、数据统计、设置。

### Backend

- Express 5 + TypeScript ESM；内部相对导入遵循现有 `.js` 后缀风格。
- Prisma 7 + MariaDB driver adapter 连接 MySQL / MariaDB，数据库已正式投入使用。
- JWT Bearer auth、Pino structured logging、request ID、全局错误处理、Sentry、CORS allowlist、body/upload limits 和 rate limits 已接入。
- 启动前会校验必要环境变量，并初始化或校验 Qdrant Knowledge collection。

### AI and Knowledge

- Chat 与 Embedding 通过当前 OpenAI-compatible HTTP provider 调用；不要擅自替换 provider 或 SDK。
- `POST /api/ai/generate` 使用 SSE，事件语义为 `delta -> sources -> done`，流中错误使用 `error`。
- Conversation 保存 User / Assistant Message，并将最近 20 条消息作为多轮上下文。
- Project RAG 流程为：query embedding -> Qdrant project filter -> MySQL ownership 二次校验 -> prompt context -> LLM -> backend-derived citation。
- 当前没有真实 Web Search service；不得声称已联网搜索或伪造网络来源。

## 4. Core Product Boundaries

- **Project 是主要业务上下文与 Knowledge scope。** Project Workspace 包含 Documents、Knowledge、Project Chat。
- Project Chat 固定为 project-scoped Conversation；Knowledge 管理属于 Project Workspace，不属于 Conversation。
- Document Editor 与 AI Sidecar 同屏。Sidecar 使用当前 Project + Document 的单个 document-scoped Conversation，并复用同一 Conversation、SSE、RAG、Citation、Stop 和 Retry 链路。
- 不要重新引入独立全局 AI Chat 作为主要入口，也不要复制第二套 AI streaming、RAG 或 Conversation 实现。
- `Project.type` 当前是元数据/展示标签，不是清理或迁移业务数据的开关。修改类型不得自动删除 Knowledge、Qdrant vectors、Documents 或 Conversations。

## 5. Data Model and Ownership

核心 Prisma 关系：

- `User 1:N Project / Conversation / KnowledgeFile / AiGeneration`
- `Project 1:N Document / Conversation / KnowledgeFile`
- `Document 1:N DocumentVersion / Conversation / AiGeneration`
- `Conversation 1:N Message`
- `KnowledgeFile 1:N KnowledgeChunk`

安全规则：

- 所有用户资源必须从 JWT 得到 current user；禁止相信 body/query 中的 `userId`。
- Project 直接按 `id + userId` 校验；Document 必须经 `Document -> Project -> userId`；Conversation 必须按 `conversation.id + userId`。
- Knowledge 必须同时校验 `projectId + userId`。Qdrant 的 `projectId` filter 只是第一层，命中的 `chunkId` 必须再通过 MySQL 的 Project/User ownership 校验后才能进入 prompt 或 sources。
- 无权资源继续遵循现有安全 404/鉴权语义，不泄漏其他用户资源是否存在。
- Stats、AI metrics 和列表查询也必须只使用 current user 数据。

## 6. Knowledge and Qdrant Invariants

- `KnowledgeFile`、`KnowledgeChunk`、Embedding、Qdrant upsert/query/delete 均已实现。
- collection 名为 `mindcraft_knowledge`，当前固定为 1024 dimensions / Cosine；启动时校验配置并确保整数类型的 `projectId` payload index。
- 不要截断或补零 embedding，也不要未经明确任务修改 vector dimension、distance、collection schema 或 payload 类型。
- 删除 KnowledgeFile 必须同步批量删除对应 Qdrant points；删除 Project 前也必须清理其 vectors。过滤空 `vectorId`，不要逐条循环删除。
- Citation 只能来自**本次检索后通过 MySQL ownership 校验**的真实 chunks，并按文件去重；模型正文中的文件名不是 Citation。
- Conversation history 不等于当前 Project Knowledge。当前 retrieval 为空时不得把旧 Assistant 内容重新包装成当前知识库事实或 sources。
- 不记录或持久化完整 prompt、AI response、embedding vector、Knowledge content、Authorization、JWT、API key 或密码。

## 7. Editor Compatibility

- `Document.content` 保存 Tiptap HTML，不保存 Markdown 或编辑器内部 JSON。
- 编辑器当前使用 StarterKit + TableKit，支持 bold、italic、headings、lists、blockquote、tables、undo/redo 和 AI 内容插入。
- **Italic 对中文、English、数字及 mixed content 的兼容行为已经专门修复。** 与 Italic 无关的任务不得重构或替换当前 Italic extension、command、active-state、mark handling 或相关 CSS。
- AI 插入通过 Tiptap transaction/update 进入既有 autosave 链路；不要创建第二套 Document 保存逻辑。
- autosave 默认约 1600ms，支持串行保存以及 saved/unsaved/saving/error 状态；DocumentVersion snapshot 策略与普通 autosave 分离，禁止每次 autosave 都创建版本。

## 8. AI and Conversation Invariants

- 保留现有 multi-turn Message persistence、Project RAG、grounded/ungrounded routing、SSE、Citation、Abort/Stop、Retry 和 AiGeneration metrics。
- 普通 Conversation generate 先保存一个 USER Message；retry 使用最后一个可重试 USER Message，不得重复保存 USER Message，成功后只追加 ASSISTANT Message。
- SSE 完成前必须发送本次真实 sources，再发送 done；无检索来源时 sources 为空。
- 前端 streaming buffer、abort cleanup 和 Sidecar 局部 state 用于避免整个 Editor 随 chunk 高频重渲染，不要无测量依据将 state 提升到页面层级。
- 不要改变 `firstTokenMs`、`durationMs`、`inputChars`、`outputChars` 的既有统计含义；metrics 写入失败不得破坏成功的 AI stream。

## 9. Database and Migration Rules

- MySQL / MariaDB 与 Prisma migrations 已正式接入，不是未来规划。
- 除非当前任务明确要求 schema change，不修改 `schema.prisma`，不创建 migration。
- 不修改、删除、合并或重写已有 migration；不执行 database reset 或破坏性数据库命令。
- 数据访问遵循现有 route/controller/service 结构，Prisma 查询优先留在 service 层。

## 10. Security and Infrastructure Rules

- 保留现有 JWT auth、request ID、Pino、Sentry、Global Error Handler、rate limit、CORS、request limits、Multer 60 KB Knowledge upload limit 和环境校验。
- Production CORS 使用 `FRONTEND_URL` allowlist；不要恢复为任意 origin。
- AI prompt 的 8000 字符业务限制与普通 JSON body limit 是不同层次，不要相互替代。
- 不要向日志、Sentry、API response 或测试输出 secrets、完整用户内容、stack trace（对客户端）或完整 vectors。
- `.env` 只保存在本地且必须被 Git 忽略；示例配置写入 `.env.example`，不得提交真实凭据。

## 11. Engineering Commands

从对应目录运行：

### Backend (`backend/`)

```bash
npm install
npm run dev
npx tsc --noEmit
npm test
```

真实 Qdrant 配置验证脚本仅在任务明确涉及外部 Qdrant 时使用：

```bash
npm run verify:qdrant
```

### Frontend (`frontend/`)

```bash
npm install
npm run dev
npx tsc -b
npm run lint
npm run build
```

CI 使用 Node.js 22、`npm ci`，并运行上述 Backend typecheck/tests 与 Frontend typecheck/lint/build。测试不得连接真实 MySQL、Qdrant 或 AI provider；沿用安全 dummy env 与 mocks。

## 12. Development Principles

1. 修改前先阅读相关现有实现，以代码事实定位根因。
2. 只做当前任务要求的最小改动，不修改无关页面、API、schema 或视觉语言。
3. 优先复用现有 module、hook、API client 和组件；不要复制 streaming、RAG、ownership、autosave 或错误处理链路。
4. 不通过大规模重构解决局部问题，不创建暂时无用途的抽象层。
5. 新增或升级 dependency 前必须说明必要性，并遵循当前 major version 的官方 API；不要为 audit 数字强制 breaking upgrade。
6. TypeScript 避免 `any`；保持现有 ESM、命名、route/controller/service 和 React 代码风格。
7. 保留用户工作区中的既有未提交修改；不要覆盖、回退或格式化无关代码。
8. 未经明确要求，不执行 `git commit`、`reset`、`checkout`、创建分支或其它 Git 写操作。
9. 单次任务预计涉及超过 8 个文件时，先拆分实施范围或向用户说明。
10. 修改后运行与影响范围相称的 typecheck/test/lint/build，并报告实际命令、结果、手动验证步骤及无法验证的部分。

## 13. Current Stage

MindCraft AI V1.0 的基础产品、RAG 链路和 Production Hardening 已完成。后续工作必须作为现有架构上的增量能力或维护修复进行；不得重新设计 Project 边界、AI pipeline、数据库基础、编辑器存储格式或权限体系，除非用户明确要求该范围。
