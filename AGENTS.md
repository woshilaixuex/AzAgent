# Repository Guidelines

## Project Structure & Module Organization
This repository is currently a minimal Node.js package with TypeScript tooling installed. The tracked project files are `package.json` and `package-lock.json`; dependencies live in `node_modules/` and should not be edited manually.

When adding application code, place TypeScript sources in `src/` and keep tests in `tests/` or next to the module as `*.test.ts`. Keep the root clean: configuration files belong at the top level, while runtime code should stay out of the repository root.

## Build, Test, and Development Commands
- `npm install` — installs project dependencies from `package-lock.json`.
- `npm test` — runs the current placeholder test script; it intentionally fails until real tests are added.
- `npx tsc --noEmit` — recommended for TypeScript type-checking once `tsconfig.json` and `src/` files are added.

If you add new workflows, expose them through `package.json` scripts so contributors can use consistent commands such as `npm run build` or `npm run dev`.

## Coding Style & Naming Conventions
Use TypeScript for new source files unless there is a strong reason to stay in plain JavaScript. Prefer 2-space indentation, semicolons, and single-responsibility modules. Use:

- `camelCase` for variables and functions
- `PascalCase` for classes and types
- `kebab-case` for file names, e.g. `task-runner.ts`

Keep modules small and avoid editing generated or vendored files under `node_modules/`.

## Testing Guidelines
There is no test framework configured yet. Add tests with the feature you introduce, and wire the chosen runner into `package.json`. Name tests clearly by behavior, for example `agent-client.test.ts` or `agent-client.spec.ts`.

Before opening a PR, run the relevant test command plus `npx tsc --noEmit` if TypeScript sources are present.

## Commit & Pull Request Guidelines
This workspace does not include Git history, so no repository-specific commit pattern is available. Use clear, imperative commit messages such as `feat: add agent bootstrap` or `fix: handle missing config`.

Pull requests should include a short summary, implementation notes, linked issues when applicable, and terminal output or screenshots for behavior changes.
