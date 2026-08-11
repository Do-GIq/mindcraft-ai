# MindCraft AI Development Rules

## Project Goal

MindCraft AI 是一个用于秋招展示的智能内容创作与项目管理平台。

当前技术栈：

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: MySQL + Prisma（后续接入）

## Development Rules

1. 每次只实现当前明确要求的功能，不提前开发未来功能。
2. 不修改与当前任务无关的代码。
3. 修复问题前先定位根因，不通过大规模重构解决小问题。
4. 不创建暂时没有实际用途的抽象层、工具类和目录。
5. 新增第三方依赖前必须说明原因。
6. 优先复用现有代码，不重复实现相同功能。
7. React 页面不要堆积大量业务逻辑，复杂功能再按实际需要拆分。
8. TypeScript 避免使用 any。
9. 不删除或重写已有可用功能，除非当前任务明确要求。
10. 不执行 git commit、reset、checkout 等 Git 写操作，除非用户明确要求。

## Verification

完成任务后：

- 不要只声称“测试通过”。
- 告诉用户实际修改了哪些文件。
- 告诉用户应该如何手动验证。
- 如果执行了命令，说明实际执行的命令和结果。
- 如果无法验证，要明确说明。

## Coding Style

- 代码优先简单、清晰、可读。
- 不为了所谓“企业级架构”进行过度设计。
- 一个模块复杂后再拆分，不提前预测未来需求。
- 保持现有项目风格一致。

## Dependency Versions

对于 Prisma、React 等可能发生 breaking changes 的库，
新增或升级依赖时应优先遵循当前官方文档，不盲目套用旧版 API。

## Codex execution rules

- 默认使用最小必要改动，不一次跨越多个业务阶段。
- 单次任务如果预计涉及超过 8 个文件，应优先拆分后再实现。
- 完成后回复保持简短，只报告修改、验证结果和遗留问题。
- 不在回复中重复大段代码，除非用户明确要求解释。