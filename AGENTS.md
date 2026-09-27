# Agent Guidelines for zettel-lint

This document provides instructions for LLMs and AI coding agents working on the `zettel-lint` repository.

## Overview & Standards

For project overview, installation, and user documentation, refer to [README.md](README.md).
For general contribution guidelines, workflow setup, and test execution details, see [CONTRIBUTING.md](CONTRIBUTING.md).
Refer to [package.json](package.json) for all available npm scripts, project dependencies, and tool configurations.

## Core Principles for Agents

- **Language & Runtime:** TypeScript targeting Node.js (>= 22.12.0).
- **Build, Testing & Quality:**
  - **Build:** `npm run build` (`tsc -p .`)
  - **Testing:** `npm test` (Vitest)
  - **Lint & Type Check:** `npm run lint` (`tsc --noEmit`)
  - Ensure all builds, tests, and type checks pass cleanly before submitting.
- **Prefer Stable APIs:** Favor established, stable APIs and standard libraries over experimental or volatile dependencies.
- **Template-First Architecture:** Prefer adding new output formatting or data options to Mustache templates (`Templator.ts` / `src/*.mustache`) rather than adding new CLI options or flags.
- **Small, Focused PRs:** Keep PRs small, incremental, and focused on a single feature, bug fix, or task.

## What NOT to Do

- **DO NOT add unnecessary CLI flags:** Avoid expanding command-line arguments when functionality can be handled within Mustache templates or configuration.
- **DO NOT modify build artifacts directly:** Never edit files in `lib/` or other output directories. Always edit source files in `src/` and build/test.
- **DO NOT combine unrelated tasks:** Avoid bundling multiple features, refactorings, or unrelated bug fixes into a single PR.
- **DO NOT use experimental or volatile APIs:** Avoid non-standard Node.js APIs or fast-changing external packages when stable alternatives exist.
- **DO NOT disable or bypass tests:** Do not delete, skip, or disable failing tests unless explicitly instructed. Fix underlying implementation issues instead.
