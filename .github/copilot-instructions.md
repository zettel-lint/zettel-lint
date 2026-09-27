# GitHub Copilot Instructions for zettel-lint

When assisting with code generation or modifications in this repository, please follow these guidelines:

## Coding Standards & Environment
- Language: TypeScript with Node.js (>= 22.12.0).
- CLI Framework: Commander.js (`src/zl.ts`).
- Testing: Vitest (`npm test`). Always include tests for new functionality.
- Type Checking: `tsc --noEmit` (`npm run lint`). Ensure zero type errors.

## Key Design Principles
1. **Prefer Stable APIs:** Choose mature, stable APIs and standard Node.js/TypeScript features rather than experimental or volatile packages.
2. **Prefer Templates over CLI Flags:** When adding output formatting or new data rendering features, prefer extending Mustache templates (`src/Templator.ts` / `src/*.mustache`) rather than introducing new command-line flags.
3. **Small & Focused Changes:** Limit changes to the single issue or feature at hand. Keep PRs small and self-contained.
