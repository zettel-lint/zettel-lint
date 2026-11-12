# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-10 - Frontmatter Templating in Fix Rules
Change: Add `frontmatter-template` rule and `-t, --frontmatter-template` option to `zl fix` (#699).
Learning: When adding missing frontmatter to notes that may also be modified by property moving rules, rule execution order must be deterministic (`frontmatter-template` prior to `inline-properties-to-frontmatter`). Using `Templator` integrates neatly with the existing templating system for placeholder substitution (`{{title}}`, `{{modified}}`).
Decision: Ensure `Templator` is reused across rules for mustache rendering, and auto-activate `frontmatter-template` whenever `-t, --frontmatter-template` is provided on the command line.
