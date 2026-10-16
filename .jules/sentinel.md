# Sentinel Security Journal

## 2025-05-20 - Path Traversal in Trello Attachment Filenames
**Vulnerability:** `saveAttachments` concatenated `outputFolder` directly with untrusted `attachment.fileName` from Trello API/export data, allowing path traversal (e.g., `../../evil.sh`) to write files outside the intended attachments directory.
**Learning:** Direct string concatenation with file names provided in external imports bypasses directory boundary checks.
**Prevention:** Always sanitize external file names using `path.basename()` and combine paths securely using `path.join()`.

## 2025-05-21 - YAML Frontmatter Injection via Raw Trello Note Fields
**Vulnerability:** Untrusted fields (`card.name`, `boardName`, list name, `card.shortUrl`) were concatenated directly inside single quotes in YAML frontmatter string templates, allowing single quotes and newlines in card or board titles to inject YAML attributes or cause YAML syntax errors.
**Learning:** Single-quoted scalar values in manual YAML generation must escape single quotes as `''` and sanitize line breaks.
**Prevention:** Use an escaping helper function like `escapeYamlString` whenever manually formatting YAML scalars from external source data.
