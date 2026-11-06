# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-06 - Formal deprecation of zl notes in favor of zl fix
Change: Formally mark `zl notes` as deprecated with runtime warning (#914).
Learning: Retaining `zl notes` as a finalized deprecated compatibility path for 1.0.0 avoids breaking existing user scripts and CLI usage, while ensuring users are warned on runtime invocation (via `console.warn`) and in CLI help text/documentation to migrate to `zl fix`.
Decision: Maintain command parity while directing users cleanly to `zl fix`.
