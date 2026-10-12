import { Collector } from "./Collector.js";

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
