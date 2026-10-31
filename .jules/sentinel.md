# Sentinel Security Journal

## 2025-05-20 - Path Traversal in Trello Attachment Filenames
**Vulnerability:** `saveAttachments` concatenated `outputFolder` directly with untrusted `attachment.fileName` from Trello API/export data, allowing path traversal (e.g., `../../evil.sh`) to write files outside the intended attachments directory.
**Learning:** Direct string concatenation with file names provided in external imports bypasses directory boundary checks.
**Prevention:** Always sanitize external file names using `path.basename()` and combine paths securely using `path.join()`.

## 2025-05-20 - Prototype Pollution and Built-in Property Collision in Property Collectors
**Vulnerability:** Inline property collection (`[key:: value]`) and YAML frontmatter parsing stored user-defined keys on standard `{}` objects. When processing keys like `toString`, `valueOf`, `__proto__`, or `constructor`, lookup of inherited prototype methods caused runtime exceptions (`TypeError: result[key] is not iterable`) or prototype pollution risks.
**Learning:** Storing dynamic untrusted keys in plain JS object maps `{}` leads to built-in method collision or prototype pollution when property keys match `Object.prototype` methods or special keys.
**Prevention:** Use `Object.create(null)` for prototype-less object maps and explicitly filter out dangerous keys (`__proto__`, `constructor`, `prototype`).

## 2025-05-20 - Unsafe Attachment URL Scheme Injection in Importers
**Vulnerability:** `saveAttachments` embedded raw attachment URLs from external imports into Markdown links and passed them to `fetch()` without URL protocol validation. This allowed malicious URI schemes like `javascript:alert(1)`, `data:`, or `file:` to be written into Markdown links or fetched.
**Learning:** External data importers must validate URL protocols before embedding links in Markdown notes or performing HTTP requests.
**Prevention:** Validate that imported URLs use `http:` or `https:` protocols before creating Markdown link targets or initiating network fetches.

## 2025-05-21 - Inherited Object.prototype Method Execution in Template Query Filters
**Vulnerability:** Mustache view context resolution evaluated un-sanitized tag query names against inherited `Object.prototype` methods (e.g. `toString`, `valueOf`). Because Mustache executes zero-argument functions found in the context object, querying built-in prototype methods invoked `Object.prototype` methods or returned function references.
**Learning:** Checking for explicit keys (`__proto__`, `constructor`, `prototype`) is insufficient if `tag in Object.prototype` can match other inherited methods.
**Prevention:** Always validate untrusted template tag queries with `tag in Object.prototype` or `Object.prototype.hasOwnProperty.call(view, tag)`.

## 2026-10-29 - Prototype Pollution and Built-in Method Collision in invertDictionary
**Vulnerability:** `invertDictionary` indexed user-supplied reference data (tags, contexts, properties) directly onto a plain `{}` object. If a tag or property was named `toString` or `valueOf`, `!tagList[tag]` evaluated to false because `Object.prototype.toString` exists, and subsequent `tagList[tag].push(link)` caused a fatal `TypeError: tagList[tag].push is not a function`. Keys like `__proto__` also posed prototype pollution risks.
**Learning:** Plain `{}` dictionary accumulators that index user-derived tags or keys are susceptible to both prototype pollution and denial-of-service via prototype method collisions.
**Prevention:** Instantiate dictionary accumulators using `Object.create(null)` and explicitly ignore `__proto__`, `constructor`, and `prototype` keys.
