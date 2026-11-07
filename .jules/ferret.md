# Feature Ferret's Journal

Critical architecture learnings and patterns discovered during Feature Ferret investigations.

## 2026-11-07 - Task priority and due date sorting in TaskCollector
Change: Added composite comparator in `TaskCollector` to sort tasks by priority, then by due date, then by content (#740).
Learning: In `TaskCollector`, `formatSortByPriority` was relying on standard lexical sort (`allTasks.sort()`). Standard lexical sort grouped `(A)` before `(B)`, but failed to order checklist items `[ ]` relative to letter priorities or handle `due:YYYY-MM-DD` timestamps when priorities matched. Implementing a rank-based comparator directly within `TaskCollector` respects the template-first and minimal CLI footprint architecture by keeping task collection sorting clean and reusable without needing extra CLI flags.
Decision: Prioritize lettered tasks `(A)`-`(Z)`, followed by checklist items `[ ]`, followed by other tasks, sorting by `due:YYYY-MM-DD` within matching priority buckets.
