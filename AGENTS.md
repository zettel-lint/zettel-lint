# Agent Guidelines for zettel-lint

This document provides instructions for LLMs, AI autonomous coding agents (e.g., Jules), and AI code review tools (e.g., CodeRabbit) working on or reviewing the `zettel-lint` repository.

## Overview & Documentation Sources

To avoid duplication of information across repository files, agents must refer to the existing documentation:
- **Project Overview & CLI Usage:** Refer to [README.md](README.md).
- **Contribution Guidelines, Workflow & Code Structure:** Refer to [CONTRIBUTING.md](CONTRIBUTING.md).
- **Tooling & Dependencies:** Refer to [package.json](package.json).

If any repository instruction or workflow detail is unclear or missing, update [README.md](README.md) or [CONTRIBUTING.md](CONTRIBUTING.md) as appropriate.

## Core Principles for Coding Agents (e.g., Jules)

- **Pre-PR Quality Checks:** Coding agents MUST run quality check tools—including `npm run lint` (`tsc --noEmit`) and `npm test` (Vitest)—prior to opening or submitting a Pull Request.
- **Language & Runtime:** TypeScript targeting Node.js (>= 22.12.0).
- **Build, Testing & Quality Commands:**
  - **Build:** `npm run build` (`tsc -p .`)
  - **Testing:** `npm test` (Vitest)
  - **Lint & Type Check:** `npm run lint` (`tsc --noEmit`)
- **Template-First Architecture:** Prefer adding new output formatting or data options to Mustache templates (`Templator.ts` / `src/*.mustache`) rather than adding new CLI options or flags.
- **Small, Focused PRs:** Keep PRs small, incremental, and focused on a single feature, bug fix, or task.
- **Address Automated Scanner Findings:** Coding agents should focus code generation on fixing any issues flagged by automated scanning tools when instructed or when modifying affected code areas.

## Guidelines for Review Agents (e.g., CodeRabbit) & Automation Boundaries

- **Automated Tool Coexistence:** Multiple automated tools operate in this repository, including Dependabot, GitHub Security, Codacy, DevSkim, CodeQL, and Scorecards.
- **Avoid Duplicating Automated Reviews:** Code review tools and agents must NOT review areas already covered by other automations, such as automated dependency update PRs (e.g., Dependabot) or standard automated security/linter workflow runs. Code review tools should focus their reviews on design, code quality, test coverage, and repository-specific guidelines.

## What NOT to Do

- **DO NOT repeat instructions:** Do not duplicate setup, usage, or contribution details in agent prompt files when they are already defined in `README.md` or `CONTRIBUTING.md`.
- **DO NOT add unnecessary CLI flags:** Avoid expanding command-line arguments when functionality can be handled within Mustache templates or configuration.
- **DO NOT modify build artifacts directly:** Never edit files in `lib/` or other output directories. Always edit source files in `src/` and build/test.
- **DO NOT combine unrelated tasks:** Avoid bundling multiple features, refactorings, or unrelated bug fixes into a single PR.
- **DO NOT disable or bypass tests:** Do not delete, skip, or disable failing tests unless explicitly instructed. Fix underlying implementation issues instead.
