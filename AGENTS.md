# Agent Guidelines for zettel-lint

This document provides guidelines for LLMs and AI coding agents working on the `zettel-lint` repository.

## Development & Coding Standards

- **Language & Runtime:** The project is written in TypeScript and target Node.js (>=22.12.0).
- **Architecture:** The CLI entrypoint is `src/zl.ts` using Commander.js. Subcommands dispatch to module handlers (`zl-index.ts`, `zl-import.ts`, `zl-fix.ts`, etc.).
- **Linting & Type Checking:** Run `npm run lint` (`tsc --noEmit`) to verify type safety.
- **Testing:** Unit and system tests are implemented with Vitest. Run tests using `npm test`. Always ensure all tests pass and add new unit/system test coverage for changes.

## Architectural Principles

1. **Prefer Stable APIs:**
   - Always favor established, stable APIs and libraries over experimental, deprecated, or fast-changing interfaces.
   - Maintain compatibility across supported Node.js versions.

2. **Template-First Enhancements:**
   - Prefer adding functionality and formatting options to templates (such as Mustache templates in `Templator.ts` / `src/*.mustache`) rather than adding new CLI options or flags unless strictly required.
   - Keep CLI options clean, essential, and intuitive.

3. **Small, Focused Pull Requests:**
   - Keep pull requests small, incremental, and focused on a single feature, task, or bug fix.
   - Avoid combining unrelated refactoring or features into a single PR.
