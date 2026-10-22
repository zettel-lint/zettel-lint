## 2025-02-18 - String Operations vs Regex & Constructor View Caching

**Learning:** Extracting file IDs using regex `.match(/[^\/\\]+$/)` and multiple `.split()` calls allocates intermediate arrays for every file indexed. Replacing these with `lastIndexOf` / `indexOf` / `slice` string operations speeds up ID extraction by ~3x. Additionally, template view object initialization in `Templator` called expensive operations (`getOrphans()`) twice and used regex replacements in inner loops for link cleaning. Caching the result and using direct string methods eliminates duplicate passes and improves view initialization by ~2x.

**Action:** Prefer string indexing over regex split/match for hot-path filename parsing, and always cache computed view properties in constructor initializations when used in multiple object properties.

## 2025-02-18 - Loop Invariant Hoisting & RegExpExecArray Direct Access

**Learning:** In collection inversion (`invertDictionary`, `invertData`), formatting links (`formatLink(ref)`) inside inner loops over item tags/data results in $O(N \times M)$ redundant string formatting calls. Hoisting `formatLink` to the outer loop reduces calls to $O(N)$. Additionally, using `next[0]` instead of `next.toString()` on `RegExpExecArray` in `collectMatches` avoids array-to-string coercion on regex matches.

**Action:** Always hoist loop-invariant formatters outside nested collection iterations and access match index `next[0]` directly on `RegExpExecArray` instances.
## 2025-05-20 - Single-Match Regex Execution & Global Regex Reuse in File Indexing

**Learning:** `collectFromFile` in `zl-index` created a new RegExp `/^(?:title:|#) (.*)$/gm` per file and called `collectMatches`, which scanned the entire document and allocated an array of all title matches even though only the first title (`[0]`) was used. Calling `exec` with a module-scoped non-global regex `/^(?:title:|#) (.*)$/m` stops scanning at the first match and eliminates array allocations and per-file regex instantiations. In addition, resetting `regex.lastIndex = 0` in `collectMatches` prevents state leakage when reusing global RegExp instances across files.

**Action:** For first-match extractions in hot file-processing paths, use module-scoped non-global regex `exec()` instead of global match loops, and always reset `lastIndex = 0` at entry when executing reused global regexes.
## 2025-02-23 - Stateful Regex Reset, Match Coercion & Map Lookup Reuse

**Learning:** Reusing stateful global regular expressions (`/g`) across files in `collectMatches` requires resetting `regex.lastIndex = 0` to avoid search index leakage. When `useCaptureGroup` is false, calling `next.toString()` on `RegExpExecArray` invokes `Array.prototype.toString()` which coerces the array to a comma-separated string (~35% overhead). Accessing `next[0]` directly avoids array serialization. Additionally, in `collectBacklinks` and `invertData`, replacing `replace()` and redundant `Map.get`/`Map.set` calls with `startsWith`/`endsWith` slicing and held Map references speeds up data processing by ~40%.

**Action:** Always reset `lastIndex = 0` on stateful regexes, use `next[0]` instead of `next.toString()`, and reuse Map entry references in nested loops.

## 2025-02-28 - Concurrent File Collection & Stateful Regex Safety

**Learning:** Reading and collecting metadata from markdown files sequentially in `parseFiles` using `for await (const file of files)` created a serial async I/O bottleneck during indexing. Converting file parsing to concurrent `Promise.all` maps allows Node to process file I/O in parallel while maintaining result order. When parallelizing async functions that execute regexes, any global `/g` regexes must remain scoped per-call to prevent concurrent race conditions on `lastIndex`.

**Action:** Use `Promise.all` with `map` for async I/O file scanning to maximize concurrent throughput, and ensure stateful regexes are kept function-scoped when called in concurrent promise contexts.

## 2026-03-31 - Direct String Slicing and Loop Optimization in `collectBacklinks`

**Learning:** In backlink processing loops over large note collections, calling `.replace("[", "").replace("]", "")` creates unnecessary intermediate string instances and regex matching overhead per tag. Furthermore, nested `.forEach` array closures allocate iterator callbacks in hot paths. Replacing string `.replace()` with `startsWith`/`endsWith` slicing and `.forEach` with indexed `for` loops speeds up backlink collection by ~2x and reduces GC pressure.

**Action:** Use direct string `substring` slicing instead of `.replace()` for trimming known boundary characters, and use indexed `for` loops in hot data processing pipelines.

## 2026-04-01 - Batch Extraction Optimization in `WikiCollector.extractAll`

**Learning:** In `WikiCollector.extractAll`, calling `this.extractData(ref)` during batch processing executed `collectBacklinks([data])` for every individual file before running `collectBacklinks(allNotes)` on the aggregated dataset. Reusing `super.extractData(ref)` during batch file collection eliminates $N$ redundant single-file backlink collector passes.

**Action:** When aggregating data across multiple notes in batch collectors, use base property extractions (`super.extractData`) to avoid invoking single-item collection routines prior to batch processing.

## 2026-04-02 - Direct Set Accumulation and Property Fast-Paths in PropertyCollector

**Learning:** `PropertyCollector.collectPairs` repeatedly re-allocated `Set` instances and spread arrays `[...new Set([...existing, ...values])]` on every inline property match, causing $O(N^2)$ memory churn during file scanning. Accumulating values directly into a single `Set` per property key during regex iteration and converting to Array once at the end eliminates unnecessary allocations. In addition, when merging YAML and inline properties in `collectProperties`, fast-pathing single-source properties avoids redundant `Set` conversions.

**Action:** In regex collection loops, accumulate values directly in persistent `Set` instances per key rather than re-creating and spreading Sets on every match, and fast-path single-source data structures.
