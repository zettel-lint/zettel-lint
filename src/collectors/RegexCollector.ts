import { Collector } from "./Collector.js";

/**
 * Collects trimmed matches in encounter order, preserving duplicates.
 *
 * @param regex - Must be global or sticky and must not produce empty matches,
 *   otherwise scanning may not terminate. Its lastIndex is reset before scanning
 *   and updated during scanning.
 * @param useCaptureGroup - When true (the default), uses a nonempty first capture
 *   group; otherwise, or when that group is absent or empty, uses the full match.
 * @returns The trimmed values, or an empty array when nothing matches.
 */
export function collectMatches(contents: string, regex: RegExp, useCaptureGroup: boolean = true): string[] {
  // Performance optimization: reset regex stateful index before scanning
  // and use direct index next[0] instead of array-to-string coercion.
  regex.lastIndex = 0;
  const result: string[] = [];
  let next = regex.exec(contents);
  while (next !== null) {
    if (useCaptureGroup && next[1]) {
      result.push(next[1].trim());
    } else {
      result.push(next[0].trim());
    }
    next = regex.exec(contents);
  }
  return result;
}

export abstract class RegexCollector extends Collector {
  readonly regex = / /g;
  /**
   * collect
   */
  public collect(content: string): string[] {
    return collectMatches(content, this.regex);
  }
}
