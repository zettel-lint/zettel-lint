## 2025-02-18 - String Operations vs Regex & Constructor View Caching

**Learning:** Extracting file IDs using regex `.match(/[^\/\\]+$/)` and multiple `.split()` calls allocates intermediate arrays for every file indexed. Replacing these with `lastIndexOf` / `indexOf` / `slice` string operations speeds up ID extraction by ~3x. Additionally, template view object initialization in `Templator` called expensive operations (`getOrphans()`) twice and used regex replacements in inner loops for link cleaning. Caching the result and using direct string methods eliminates duplicate passes and improves view initialization by ~2x.

**Action:** Prefer string indexing over regex split/match for hot-path filename parsing, and always cache computed view properties in constructor initializations when used in multiple object properties.
