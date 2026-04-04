# `src/skills`

## 模块职责

`skill.ts` 提供技能实体 `Skill` 与技能加载器 `SkillsLoader`。加载器会扫描项目根目录下的 `skills/`，读取每个技能子目录的名称、路径与描述信息，并把它们实例化为 `Skill` 后放入 `loader.skills`。

## 当前加载规则

每个技能建议使用一个独立目录，例如：

```text
skills/
  summarize/
    skill.json
    README.md
```

支持的元信息文件：

- `skill.json`
  - `name`：可选，技能名，默认使用目录名
  - `description`：可选，技能描述；未填写时会取正文第一条非空行
  - `bodyFile`：可选，自定义正文文件名

支持的正文文件默认查找顺序：

1. `README.md`
2. `skill.md`
3. `prompt.md`
4. `body.md`
5. 当前目录下首个 `.md` 或 `.txt` 文件

## `skill.ts` 主要内容

- `Skill`
  - 保存技能的 `name`、`description`、`path`、`body`、`dir`
  - 通过 `toTool()` 转成 LangChain tool
  - 实现 `CanManaged`，因此也可以通过 `toTools()` 被统一转成 `ManagedTool`

- `SkillsLoader.dirsLoad()`
  - 返回 `skills/` 下所有子目录的 `name` 与绝对 `path`

- `SkillsLoader.skillLoad()`
  - 加载所有技能目录
  - 读取技能清单与正文内容
  - 创建 `Skill` 实例并写入 `skills`

## 默认行为

当前加载器会为文件型技能提供一个默认 `run`：

- 没有输入时，直接返回技能正文
- 有输入时，返回“技能正文 + 用户输入”

这让目录型技能在还没有独立执行逻辑时，也能先作为说明型/提示型技能被加载与调用。

## 与工具管理的关系

`Skill` 现在自带：

- `source = "skill"`
- `toTool(): StructuredToolInterface`

这意味着 `SkillsLoader.skillLoad()` 返回的 `Skill[]`，后续可以直接传给 `src/tools/tools.ts` 里的 `toTools()`，统一变成带来源信息的 `ManagedTool[]`，再交给工具管理器或 agent 继续处理。
