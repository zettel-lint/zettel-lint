import { Collector } from "./Collector.js";

export function collectMatches(contents: string, regex: RegExp, useCaptureGroup: boolean = true): string[] {
  var result: string[] = [];
  var next: RegExpExecArray | null;
  do {
    next = regex.exec(contents);
    if (next) {
      if (useCaptureGroup && next[1]) {
        result.push(next[1].trim());
      } else {
        result.push(next.toString().trim());
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
