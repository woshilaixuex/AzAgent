# 仓库指南

## 项目结构与模块组织
当前仓库是一个安装了 TypeScript 工具链的最小化 Node.js 包。当前受版本控制的项目文件为 `package.json` 和 `package-lock.json`；依赖位于 `node_modules/` 中，不应手动修改。

添加应用代码时，请将 TypeScript 源文件放在 `src/` 目录下，并将测试放在 `tests/` 中，或与模块同目录并命名为 `*.test.ts`。保持仓库根目录整洁：配置文件放在顶层，运行时代码不要直接放在仓库根目录。

`src/`下有对应的`README.md`文档，里面有对各个模块的功能以及每个文件里具体函数作用的详解
## 构建、测试与开发命令
- `npm install`：根据 `package-lock.json` 安装项目依赖。
- `npm test`：运行当前占位测试脚本；在添加真实测试之前，它会按预期失败。
- `npx tsc --noEmit`：在添加 `tsconfig.json` 和 `src/` 文件后，推荐使用该命令进行 TypeScript 类型检查。

如果你新增了工作流，请通过 `package.json` 中的脚本对外暴露，这样贡献者就可以使用统一命令，例如 `npm run build` 或 `npm run dev`。

## 编码风格与命名约定
新增源码文件请优先使用 TypeScript，除非有充分理由继续使用纯 JavaScript。推荐使用 2 个空格缩进、分号，以及单一职责模块。命名约定如下：

- 变量和函数使用 `camelCase`
- 类和类型使用 `PascalCase`
- 文件名使用 `kebab-case`，例如 `task-runner.ts`

保持模块小而清晰，避免编辑 `node_modules/` 下自动生成或第三方引入的文件。

## 测试指南
当前尚未配置测试框架。新增功能时请一并补充测试，并将所选测试运行器接入 `package.json`。测试文件命名应清晰表达行为，例如 `agent-client.test.ts` 或 `agent-client.spec.ts`。

在提交 PR 之前，请运行相关测试命令；如果仓库中包含 TypeScript 源码，也请运行 `npx tsc --noEmit`。

## 提交与 Pull Request 指南
当前工作区未包含 Git 历史，因此没有可参考的仓库专属提交规范。请使用清晰、祈使式的提交信息，例如 `feat: add agent bootstrap` 或 `fix: handle missing config`。

Pull Request 应包含简要摘要、实现说明、相关 issue 链接（如适用），以及行为变更对应的终端输出或截图。
## 注意事项
记得每次操作完，把`src`包下面各个模块的`README.md`文件完善下，让他与符合项目