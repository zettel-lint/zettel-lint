# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-08 - Rule Configuration Files for Fix Command
Change: Support configuration files (JSON/YAML/stdin) for `zl fix` rules with CLI argument overrides (#998).
Learning: Decoupling rule specification and per-rule filtering (includes/excludes) into a unified configuration format allows users to manage complex multi-rule linting pipelines cleanly without overwhelming CLI command invocations, while preserving CLI argument precedence.
Decision: Support both JSON and YAML transparently with stdin (`-`) support and apply per-rule globs before executing each active rule in `fixNotes`.

## 2026-11-06 - Formal deprecation of zl notes in favor of zl fix
Change: Formally mark `zl notes` as deprecated with runtime warning (#914).
Learning: Retaining `zl notes` as a finalized deprecated compatibility path for 1.0.0 avoids breaking existing user scripts and CLI usage, while ensuring users are warned on runtime invocation (via `console.warn`) and in CLI help text/documentation to migrate to `zl fix`.
Decision: Maintain command parity while directing users cleanly to `zl fix`.

## 2026-11-10 - Frontmatter Templating in Fix Rules
Change: Add `frontmatter-template` rule and `-t, --frontmatter-template` option to `zl fix` (#699).
Learning: When adding missing frontmatter to notes that may also be modified by property moving rules, rule execution order must be deterministic (`frontmatter-template` prior to `inline-properties-to-frontmatter`). Using `Templator` integrates neatly with the existing templating system for placeholder substitution (`{{title}}`, `{{modified}}`).
Decision: Ensure `Templator` is reused across rules for mustache rendering, and auto-activate `frontmatter-template` whenever `-t, --frontmatter-template` is provided on the command line.
