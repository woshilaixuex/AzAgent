# `src`

## 模块概览

`src/` 是项目运行时代码目录，当前主要由以下模块组成：

- `agent.ts`
  - 创建 CLI Agent
  - 组装 LangChain `createAgent()` 所需的模型、tools 与 system prompt
  - 在启动时加载 `skills/` 目录里的技能，并把它们注册到 agent

- `skills/`
  - `skill.ts` 提供 `Skill` 与 `SkillsLoader`
  - 负责扫描 `skills/` 子目录，读取技能元信息与正文

- `tools/`
  - 放置项目内建工具与本地工具

- `core/`
  - 提供 agent 抽象、状态流转等基础能力

## 当前 Agent 启动流程

`createCliAgent()` 现在是异步工厂，启动顺序如下：

1. 首次调用 `getCliAgent()` 时读取配置并创建模型
2. 使用 `SkillsLoader` 扫描项目根目录下的 `skills/`
3. 把加载出的每个 `Skill` 先通过 `toTools()` 标准化为 `ManagedTool`
4. 取出其中的 `tool`，再与 `tools`、`local_tools` 合并为 `allTools`
5. 创建真正执行对话的 LangChain agent
6. 将实例缓存起来，后续请求直接复用

这意味着只要你往项目根目录的 `skills/` 下新增技能目录，agent 首次初始化时它就会被自动加载并参与工具调用；同一个进程里的后续对话不会重复创建 agent。
