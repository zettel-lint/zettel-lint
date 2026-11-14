# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-07 - Task priority and due date sorting in TaskCollector
Change: Added composite comparator in `TaskCollector` to sort tasks by priority, then by due date, then by content (#740).
Learning: In `TaskCollector`, `formatSortByPriority` was relying on standard lexical sort (`allTasks.sort()`). Standard lexical sort grouped `(A)` before `(B)`, but failed to order checklist items `[ ]` relative to letter priorities or handle `due:YYYY-MM-DD` timestamps when priorities matched. Implementing a rank-based comparator directly within `TaskCollector` respects the template-first and minimal CLI footprint architecture by keeping task collection sorting clean and reusable without needing extra CLI flags.
Decision: Prioritize lettered tasks `(A)`-`(Z)`, followed by checklist items `[ ]`, followed by other tasks, sorting by `due:YYYY-MM-DD` within matching priority buckets.

## 2026-11-06 - Formal deprecation of zl notes in favor of zl fix
Change: Formally mark `zl notes` as deprecated with runtime warning (#914).
Learning: Retaining `zl notes` as a finalized deprecated compatibility path for 1.0.0 avoids breaking existing user scripts and CLI usage, while ensuring users are warned on runtime invocation (via `console.warn`) and in CLI help text/documentation to migrate to `zl fix`.
Decision: Maintain command parity while directing users cleanly to `zl fix`.

## 2026-11-10 - Frontmatter Templating in Fix Rules
Change: Add `frontmatter-template` rule and `-t, --frontmatter-template` option to `zl fix` (#699).
Learning: When adding missing frontmatter to notes that may also be modified by property moving rules, rule execution order must be deterministic (`frontmatter-template` prior to `inline-properties-to-frontmatter`). Using `Templator` integrates neatly with the existing templating system for placeholder substitution (`{{title}}`, `{{modified}}`).
Decision: Ensure `Templator` is reused across rules for mustache rendering, and auto-activate `frontmatter-template` whenever `-t, --frontmatter-template` is provided on the command line.
