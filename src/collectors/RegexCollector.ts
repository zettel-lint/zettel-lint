import { Collector } from "./Collector.js";

export function collectMatches(contents: string, regex: RegExp, useCaptureGroup: boolean = true): string[] {
  // Performance optimization: Reset regex lastIndex to prevent state leakage from re-used global RegExp instances
  regex.lastIndex = 0;
  var result: string[] = [];
  var next: RegExpExecArray | null;
  do {
    next = regex.exec(contents);
    if (next) {
      if (useCaptureGroup && next[1]) {
        result.push(next[1].trim());
      } else {
        // Performance optimization: Access next[0] directly instead of calling toString() on RegExpExecArray
        result.push(next[0].trim());
      }
    }
  } while (next);
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
