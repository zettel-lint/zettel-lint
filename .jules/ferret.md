# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-08 - Rule Configuration Files for Fix Command
Change: Support configuration files (JSON/YAML/stdin) for `zl fix` rules with CLI argument overrides (#998).
Learning: Decoupling rule specification and per-rule filtering (includes/excludes) into a unified configuration format allows users to manage complex multi-rule linting pipelines cleanly without overwhelming CLI command invocations, while preserving CLI argument precedence.
Decision: Support both JSON and YAML transparently with stdin (`-`) support and apply per-rule globs before executing each active rule in `fixNotes`.
