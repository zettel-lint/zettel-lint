# Technical Requirements & Architecture Research: Obsidian Plugin for `zettel-lint`

**Issue Reference:** [#518 - Create obsidian wrapper for npm package](https://github.com/zettel-lint/zettel-lint/issues/518)
**Author:** AI Technical Research & Architecture Specification
**Date:** March 2026

---

## Executive Summary

Issue [#518](https://github.com/zettel-lint/zettel-lint/issues/518) proposes creating an Obsidian plugin wrapper around `zettel-lint`. This document outlines:
1. The technical requirements and architectural constraints for building an Obsidian plugin wrapper.
2. The necessary core refactoring within `zettel-lint` to support programmatic library usage.
3. A recommendation on repository organization (**Separate Repository** under the `zettel-lint` organization vs. **Single Repository / Monorepo**).
4. An actionable implementation roadmap.

### Recommendation Overview
- **Repository Strategy:** **Create a separate repository** named `zettel-lint/obsidian-zettel-lint` under the `zettel-lint` GitHub organization.
- **Library Strategy:** Refactor `zettel-lint/zettel-lint` to decouple core indexing, linting, and rule logic from CLI concerns (`commander`, `chalk`, `figlet`, `clear`), exposing a clean, side-effect-free TypeScript/JavaScript API published to npm.

---

## Part 1: Obsidian Plugin Technical Requirements & Architecture

### 1. Obsidian Plugin API & Lifecycle
An Obsidian plugin is a TypeScript/JavaScript module that runs inside Obsidian's Electron runtime (on desktop) or JavaScript engine (on iOS/Android mobile).
- **Base Class:** Must extend `Plugin` from the official `obsidian` npm package.
- **Manifest File:** Requires a `manifest.json` at the plugin root specifying:
  ```json
  {
    "id": "zettel-lint",
    "name": "Zettel Lint",
    "version": "1.0.0",
    "minAppVersion": "0.15.0",
    "description": "Linter and index generator for markdown Zettelkasten repositories.",
    "author": "Craig Nicol",
    "isDesktopOnly": false
  }
  ```
- **Lifecycle Methods:**
  - `onload()`: Registers commands, settings tabs, ribbon icons, and vault event listeners.
  - `onunload()`: Cleans up resources.

### 2. File System Abstraction (Obsidian Vault API vs. Node `fs`)
#### The Challenge
Currently, `zettel-lint` uses Node's `fs` (`fs.promises`) and `glob` to scan directories and read/write files directly on disk.
- **Desktop vs. Mobile:** Direct Node `fs` calls work on desktop (Electron), but **fail completely on mobile devices** (iOS/Android), where Node.js built-ins do not exist.
- **Vault Cache & Syncing:** Bypassing Obsidian's `Vault` API on desktop bypasses Obsidian's in-memory metadata cache, undo history, and real-time vault event triggers, potentially causing file sync conflicts or UI stale data.

#### The Solution: File Adapter Interface
To support Obsidian (and future non-CLI environments like VS Code extensions or web tools), `zettel-lint` core must decouple file I/O using an abstract file system interface:

```typescript
export interface FileAdapter {
  listFiles(pattern?: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir?(path: string): Promise<void>;
}
```

In the CLI tool, a `NodeFileAdapter` wrapping `node:fs` and `glob` will be used.
In the Obsidian plugin, an `ObsidianVaultAdapter` wrapping `app.vault` will be passed to `zettel-lint`:

```typescript
export class ObsidianVaultAdapter implements FileAdapter {
  constructor(private vault: Vault) {}

  async listFiles(): Promise<string[]> {
    return this.vault.getMarkdownFiles().map(f => f.path);
  }

  async readFile(path: string): Promise<string> {
    const file = this.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return await this.vault.read(file);
    }
    throw new Error(`File not found: ${path}`);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.vault.modify(file, content);
    } else {
      await this.vault.create(path, content);
    }
  }
}
```

### 3. Decoupling `zettel-lint` Core Programmatic API
Currently, `zl-index.ts` and `zl-fix.ts` combine CLI parsing, console printing (`chalk`, `figlet`, `clear`), and execution.

To support the Obsidian wrapper, `zettel-lint` needs to expose pure programmatic functions without side-effects:

```typescript
// Core Library Exports (src/index.ts)
export { collectFromFile, indexerCore } from './zl-index.js';
export { fixNotesCore, fixContent } from './zl-fix.js';
export { Templator } from './Templator.js';
export * from './collectors/index.js';
export * from './rules/index.js';
export type { FileAdapter, ZlIndexOptions, ZlFixOptions } from './types.js';
```

Key requirements for core logic:
- Core collectors (`WikiCollector`, `TagCollector`, `TaskCollector`, `ContextCollector`, `PropertyCollector`) and rules (`TrailingNewlineRule`, `InlinePropertiesToFrontmatterRule`) must be pure and free of CLI dependencies (`chalk`, `commander`, `figlet`, `clear`).
- Execution functions must accept options objects and an optional `FileAdapter`.

### 4. User Interface & User Experience in Obsidian
The plugin wrapper will expose `zettel-lint` functionality through standard Obsidian UI components:

1. **Commands (Command Palette):**
   - `Zettel Lint: Generate Index / References`: Runs `zl index` over the vault using active settings and template.
   - `Zettel Lint: Fix Current File`: Applies active fix rules to the currently open Markdown note.
   - `Zettel Lint: Fix All Notes in Vault`: Applies active fix rules vault-wide.
2. **Plugin Settings Tab (`PluginSettingTab`):**
   - **Indexer Settings:** Reference file path (default: `references.md`), Mustache template path/content, ignore directory globs, task display format (`none`, `by-file`, `by-priority`), ignore numeric tags toggle, wiki-link format toggle.
   - **Fixer Settings:** Enabled rules (e.g. `trailing-newline`, `inline-properties-to-frontmatter`), property filter regex patterns, move vs copy inline properties toggle.
3. **Notifications & Status Bar:**
   - Use Obsidian `Notice` popups to show execution results (e.g., *"Zettel Lint: Updated references.md (142 notes processed)"*).
   - Optional status bar indicator showing linter state or status during long vault index operations.

### 5. Bundling & Dependencies (`esbuild`)
- Obsidian plugins must be bundled into a single `main.js` file using `esbuild`.
- External dependencies used by `zettel-lint` core:
  - `mustache`, `yaml`, `simple-markdown`: Pure JavaScript libraries easily bundled into `main.js`.
  - `commander`, `chalk`, `figlet`, `clear`: **CLI-only dependencies** that must be excluded/tree-shaken from the core library consumed by Obsidian.

---

## Part 2: Repository Structure Recommendation

We evaluated two repository organizational strategies:

1. **Option A: Separate Repository (`zettel-lint/obsidian-zettel-lint`)** *(RECOMMENDED)*
2. **Option B: Monorepo / Single Repository (`zettel-lint/zettel-lint`)**

### Strategy Comparison Matrix

| Criteria | Option A: Separate Repo (`obsidian-zettel-lint`) | Option B: Single Repo / Monorepo |
| :--- | :--- | :--- |
| **Obsidian Community Plugin Release** | **Seamless.** Obsidian release bots require `manifest.json`, `main.js`, and `styles.css` at the release root matching exact git tags. | **Complex.** Requires custom multi-tag release workflows or subfolder packaging hacks. |
| **Dependency Isolation** | **Clean.** Keeps Obsidian API types and `esbuild` separate from CLI dependencies (`commander`, `chalk`, `figlet`). | **Polluted.** Combines CLI, Node, and Obsidian browser/Electron dependencies in one `package.json`. |
| **Versioning & Release Cycles** | **Independent.** Obsidian plugin can release bug fixes or UI updates without bumping the CLI version. | **Tightly Coupled.** Every minor UI fix in Obsidian forces a CLI version bump. |
| **Compliance with Project Vision** | **High.** Follows `vision.md` UNIX principle of independent tools and small single-purpose modules. | **Medium.** Mixes CLI tool maintenance with IDE extension maintenance. |
| **Testing & CI/CD** | **Isolated.** Vitest for `zettel-lint` core tests; separate Obsidian vault mocking tests for the plugin. | **Heavy CI.** Runs all CLI and plugin tests on every commit. |

### Recommendation: Separate Repository under the `zettel-lint` Organization

We strongly recommend **Option A (Separate Repository)** for the following reasons:

1. **Obsidian Community Plugin Distribution Standard:**
   To list a plugin in Obsidian's official Community Plugin store, maintainers submit a PR to `obsidianmd/obsidian-releases`. The validation bot inspects GitHub releases of the plugin repository for `manifest.json` and `main.js`. Having a dedicated repository `zettel-lint/obsidian-zettel-lint` makes automation, release tagging, and compliance straightforward.
2. **Architectural Decoupling:**
   Creating a separate repository enforces a healthy architectural boundary: `zettel-lint` must be published as a clean npm package with a well-defined public TypeScript API. The Obsidian plugin becomes a standard consumer of that API.
3. **Cross-Platform Compatibility (Mobile & Desktop):**
   The Obsidian plugin repo can focus on testing inside Obsidian's virtual vault environment, ensuring compatibility across desktop and mobile.

---

## Part 3: Actionable Implementation Roadmap

### Phase 1: Core Library Refactoring (in `zettel-lint/zettel-lint`)
1. **Export Public Library API:**
   - Create `src/index.ts` exporting collectors, rules, `Templator`, and core indexing/fixing logic.
   - Update `package.json` to include `"main": "./lib/index.js"` and `"types": "./lib/index.d.ts"`.
2. **Introduce `FileAdapter` Interface:**
   - Define `FileAdapter` in `src/types.ts`.
   - Implement `NodeFileAdapter` for CLI file operations.
   - Refactor `collectFromFile`, `indexer`, and `fixNotes` to accept a `FileAdapter` instance rather than directly invoking `fs.readFile` and `glob`.
3. **Verify Pure Functions & Tests:**
   - Ensure collectors and rules do not import CLI packages (`chalk`, `figlet`, `clear`).
   - Run `npm test` and `npm run lint` to confirm 100% test passing and zero regressions.

### Phase 2: Obsidian Plugin Creation (in `zettel-lint/obsidian-zettel-lint`)
1. **Repository Setup:**
   - Initialize `zettel-lint/obsidian-zettel-lint` using the official `obsidianmd/obsidian-sample-plugin` template.
   - Install `zettel-lint` as a dependency (`npm install zettel-lint`).
2. **Implement `ObsidianVaultAdapter`:**
   - Create vault adapter translating Obsidian's `Vault` API (`read`, `modify`, `create`, `getMarkdownFiles`) into `zettel-lint`'s `FileAdapter`.
3. **Implement UI Integration:**
   - Create `ZettelLintSettingTab` for configuration options.
   - Register commands: `Index Vault`, `Fix Current Note`, `Fix Vault`.
   - Add status notifications using Obsidian `Notice`.
4. **Build & Package:**
   - Configure `esbuild` to bundle `main.ts` and dependencies into `main.js`.

### Phase 3: Verification & Store Submission
1. **Testing:**
   - Test plugin locally in an Obsidian test vault on Desktop (macOS/Windows/Linux) and Mobile (iOS/Android).
2. **Community Release:**
   - Publish v1.0.0 release on GitHub with `manifest.json`, `main.js`, and `styles.css`.
   - Submit PR to `obsidianmd/obsidian-releases` for official community plugin listing.
