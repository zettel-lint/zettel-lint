# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-09 - Qualified deprecation warnings across command parity gaps
Change: Issue #1035 - Clarify zl notes deprecation warning for numeric-link users
Learning: When deprecating a legacy command (`zl notes`) in favor of an evolving replacement (`zl fix`), unqualified deprecation warnings can mislead users if functional parity gaps exist (such as `[id]` numeric-link conversion). A blanket warning causes users to migrate prematurely and break existing workflows.
Decision: Always qualify runtime deprecation warnings and migration guidance by explicitly identifying capability gaps and directing users with unmet feature needs to continue using the legacy path until the replacement achieves full feature parity.
