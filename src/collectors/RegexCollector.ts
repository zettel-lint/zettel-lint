import { Collector } from "./Collector.js";

export function collectMatches(contents: string, regex: RegExp, useCaptureGroup: boolean = true): string[] {
  // Reset regex state so reused global RegExp instances start searching at index 0
  regex.lastIndex = 0;
  var result: string[] = [];
  var next = regex.exec(contents);
  while (next !== null) {
    if (useCaptureGroup && next[1]) {
      result.push(next[1].trim());
    } else {
      // Use full match string directly instead of next.toString() array conversion
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
