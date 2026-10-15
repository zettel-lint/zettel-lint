## 2025-02-18 - String Operations vs Regex & Constructor View Caching

**Learning:** Extracting file IDs using regex `.match(/[^\/\\]+$/)` and multiple `.split()` calls allocates intermediate arrays for every file indexed. Replacing these with `lastIndexOf` / `indexOf` / `slice` string operations speeds up ID extraction by ~3x. Additionally, template view object initialization in `Templator` called expensive operations (`getOrphans()`) twice and used regex replacements in inner loops for link cleaning. Caching the result and using direct string methods eliminates duplicate passes and improves view initialization by ~2x.

**Action:** Prefer string indexing over regex split/match for hot-path filename parsing, and always cache computed view properties in constructor initializations when used in multiple object properties.

## 2025-05-20 - Single-Match Regex Execution & Global Regex Reuse in File Indexing

**Learning:** `collectFromFile` in `zl-index` created a new RegExp `/^(?:title:|#) (.*)$/gm` per file and called `collectMatches`, which scanned the entire document and allocated an array of all title matches even though only the first title (`[0]`) was used. Calling `exec` with a module-scoped non-global regex `/^(?:title:|#) (.*)$/m` stops scanning at the first match and eliminates array allocations and per-file regex instantiations. In addition, resetting `regex.lastIndex = 0` in `collectMatches` prevents state leakage when reusing global RegExp instances across files.

**Action:** For first-match extractions in hot file-processing paths, use module-scoped non-global regex `exec()` instead of global match loops, and always reset `lastIndex = 0` at entry when executing reused global regexes.
