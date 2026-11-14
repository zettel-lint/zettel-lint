# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-09 - Qualified deprecation warnings across command parity gaps
Change: Issue #1035 - Clarify zl notes deprecation warning for numeric-link users
Learning: When deprecating a legacy command (`zl notes`) in favor of an evolving replacement (`zl fix`), unqualified deprecation warnings can mislead users if functional parity gaps exist (such as `[id]` numeric-link conversion). A blanket warning causes users to migrate prematurely and break existing workflows.
Decision: Always qualify runtime deprecation warnings and migration guidance by explicitly identifying capability gaps and directing users with unmet feature needs to continue using the legacy path until the replacement achieves full feature parity.

## 2026-11-10 - Frontmatter Templating in Fix Rules
Change: Add `frontmatter-template` rule and `-t, --frontmatter-template` option to `zl fix` (#699).
Learning: When adding missing frontmatter to notes that may also be modified by property moving rules, rule execution order must be deterministic (`frontmatter-template` prior to `inline-properties-to-frontmatter`). Using `Templator` integrates neatly with the existing templating system for placeholder substitution (`{{title}}`, `{{modified}}`).
Decision: Ensure `Templator` is reused across rules for mustache rendering, and auto-activate `frontmatter-template` whenever `-t, --frontmatter-template` is provided on the command line.
