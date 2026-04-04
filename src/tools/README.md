# `src/tools`

## 模块职责

`tools.ts` 是工具层的公共入口，负责两类事情：

- 提供项目内建 LangChain tools，例如 `listProjectFiles`、`readProjectFile`
- 定义“可被托管的工具对象”和真正注册后的 `ManagedTool` 之间的转换协议

## `tools.ts` 主要内容

- `tools`
  - 当前项目内建工具数组
  - 可直接提供给 LangChain agent 使用

- `CanManaged`
  - 表示“可以被工具管理器接管”的对象
  - 约定必须提供 `name`、`description`、`source`
  - 并实现 `toTool()`，把自己转成 LangChain `StructuredToolInterface`

- `ManagedTool`
  - 工具管理器内部统一使用的结构
  - 保留来源信息和原始元数据
  - `tool` 字段保存真正执行的 LangChain tool

- `toManagedTool()` / `toTools()`
  - 把单个或多个 `CanManaged` 转成 `ManagedTool`
  - 后续 skill、mcp、本地工具都可以走这条统一转换链路

- `ToolsManager`
  - 提供注册、列出、调用托管工具的基础能力

## 当前约定

如果一个对象想接入工具管理层，推荐直接实现 `CanManaged`。这样调用 `toTools()` 后，就能得到标准化的 `ManagedTool` 结构，避免在不同模块里重复拼装 `name`、`description`、`source` 和 `tool`。
