export abstract class BaseRule {
  abstract readonly name: string;
  abstract fix(content: string, filePath: string): string;
}

export class TrailingNewlineRule extends BaseRule {
  readonly name = "trailing-newline";

  fix(content: string, filePath: string): string {
    if (!content.endsWith("\n")) {
      return content + "\n";
    }
    return content;
  }
}