import { parse, stringify } from "yaml";
import { type fileWikiLinks, type formatData, invertData } from "../types.js";

export interface YamlHeaders {
	[property: string]: string[] | undefined;
}

export abstract class Collector {
  abstract readonly dataName: string;
  protected yaml: any;
  protected programArgs: any;
  public collector(filename: string, content: string, program: any): string[] {
    this.programArgs = program;
    if (this.shouldCollect(filename)) {
      const ignoreQuoted = program?.ignoreQuoted !== false;
      const processedContent = ignoreQuoted ? this.stripQuoted(content) : content;
      return this.collect(processedContent);
    }
    return [];
  }

  /**
   * Strips quoted sections from content when ignoreQuoted option is enabled.
   * Strips:
   * 1. Code blocks (fenced with ``` or ~~~)
   * 2. Inline code (`code`)
   * 3. Blockquotes (lines starting with >)
   * 4. Double-quoted strings ("...") and single-quoted strings ('...')
   */
  protected stripQuoted(content: string): string {
    if (!content) {
      return content;
    }

    const mask = (quoted: string): string => quoted.replace(/[^\r\n]/g, " ");
    const frontmatterMatch = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
    const frontmatter = frontmatterMatch.exec(content);
    const body = frontmatter ? content.slice(frontmatter[0].length) : content;
    const strippedBody = this.stripQuotedBody(body, mask);
    return frontmatter ? content.slice(0, frontmatter[0].length) + strippedBody : strippedBody;
  }

  private stripQuotedBody(content: string, mask: (quoted: string) => string): string {
    let stripped = this.stripFencedCodeBlocks(content, mask);
    stripped = this.stripInlineCodeSpans(stripped, mask);
    stripped = stripped.replace(/^[ \t]*>.*$/gm, mask);
    stripped = stripped.replace(/"[^"\r\n]*"/g, mask);
    stripped = stripped.replace(/(?:^|[\s([{<])'[^'\r\n]*'(?=[\s,.;:!?)]|$)/g, mask);
    return stripped;
  }

  private stripFencedCodeBlocks(content: string, mask: (quoted: string) => string): string {
    let result = "";
    let index = 0;

    while (index < content.length) {
      const fenceStart = this.findFenceStart(content, index);
      if (!fenceStart) {
        result += content.slice(index);
        break;
      }

      result += content.slice(index, fenceStart.start);
      let cursor = fenceStart.end;
      let end = content.length;
      while (cursor < content.length) {
        const nextNewline = content.indexOf("\n", cursor);
        const lineEnd = nextNewline === -1 ? content.length : nextNewline;
        const line = content.slice(cursor, lineEnd);
        const closeMatch = line.match(/^([ \t]*)(`{3,}|~{3,})([ \t]*)$/);
        if (closeMatch && closeMatch[2][0] === fenceStart.fence[0] && closeMatch[2].length >= fenceStart.fence.length) {
          end = lineEnd === content.length ? content.length : lineEnd + 1;
          break;
        }
        cursor = lineEnd === content.length ? content.length : lineEnd + 1;
      }

      result += mask(content.slice(fenceStart.start, end));
      index = end;
    }

    return result;
  }

  private stripInlineCodeSpans(content: string, mask: (quoted: string) => string): string {
    let result = "";
    let index = 0;

    while (index < content.length) {
      const codeStart = content.indexOf("`", index);
      if (codeStart === -1) {
        result += content.slice(index);
        break;
      }

      result += content.slice(index, codeStart);
      const openerLength = this.countRepeated(content, codeStart, "`");
      let closeIndex = -1;
      for (let i = codeStart + openerLength; i < content.length; i++) {
        if (content[i] === "`") {
          const closerLength = this.countRepeated(content, i, "`");
          if (closerLength >= openerLength) {
            closeIndex = i + closerLength;
            break;
          }
        }
      }

      if (closeIndex === -1) {
        result += mask(content.slice(codeStart));
        break;
      }

      result += mask(content.slice(codeStart, closeIndex));
      index = closeIndex;
    }

    return result;
  }

  private findFenceStart(content: string, fromIndex: number): { start: number; end: number; fence: string } | undefined {
    let index = fromIndex;
    while (index < content.length) {
      const newlineIndex = content.indexOf("\n", index);
      const lineEnd = newlineIndex === -1 ? content.length : newlineIndex;
      const line = content.slice(index, lineEnd);
      const match = line.match(/^([ \t]*)(`{3,}|~{3,})(.*)$/);
      if (match) {
        return { start: index, end: lineEnd === content.length ? content.length : lineEnd + 1, fence: match[2] };
      }
      index = lineEnd === content.length ? content.length : lineEnd + 1;
    }
    return undefined;
  }

  private countRepeated(content: string, index: number, needle: string): number {
    let count = 0;
    while (index + count < content.length && content[index + count] === needle) {
      count++;
    }
    return count;
  }
  protected shouldCollect(filename: string): boolean { return true; }
  protected abstract collect(content: string): string[];
  private listOf(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      return trimmed.slice(1, -1).replaceAll(", ", ",").split(",");
    }
    const parts = trimmed.split(" ");
    const result: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        result.push(parts[i]);
      }
    }
    return result;
  }
  private getValue(headers: string[][], key: string) : string {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i][0] === key) return headers[i][1];
    }
    return "";
  }
  private readonly yamlSep = "---\n";
  protected collectYaml(content: string) : YamlHeaders {
    const result: YamlHeaders = Object.create(null);
    result.tags = undefined;
    if (!content.startsWith(this.yamlSep)){
      return result;
    }
    // Performance optimization: Avoid executing YAML parser on unclosed or missing frontmatter
    const endIndex = content.indexOf(this.yamlSep, this.yamlSep.length);
    if (endIndex === -1) {
      return result;
    }
    const header = content.substring(this.yamlSep.length, endIndex);
    const yamlData = parse(header);

		if (!yamlData || typeof yamlData !== "object") {
			return result;
		}

    // Performance optimization: Avoid Object.entries array allocations and map closures per property
    for (const key in yamlData) {
      // biome-ignore lint/suspicious/noPrototypeBuiltins: TS target is es2021 so Object.hasOwn cannot be used
      if (!Object.prototype.hasOwnProperty.call(yamlData, key)) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const value = yamlData[key];
      if (key === 'tags') {
        if (Array.isArray(value)) {
          const arr: string[] = new Array(value.length);
          for (let i = 0; i < value.length; i++) {
            arr[i] = String(value[i]);
          }
          result[key] = arr;
        } else {
          result[key] = this.listOf(String(value));
        }
      } else if (Array.isArray(value)) {
        const arr: string[] = new Array(value.length);
        for (let i = 0; i < value.length; i++) {
          arr[i] = String(value[i]);
        }
        result[key] = arr;
      } else {
        result[key] = [String(value)];
      }
    }

    return result;
  }
  public extractData(ref: fileWikiLinks): formatData {
    return {
      ...ref,
      name: this.dataName,
      data: ref.matchData[this.dataName],
      bag: []
    };
  };
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    if (!files || files.length === 0) return new Map<string, formatData[]>();

    // Performance optimization: Avoid array allocation overhead by only accumulating
    // formatData items that contain non-empty collector data before passing to invertData.
    const formatDataList: formatData[] = [];
    for (let i = 0; i < files.length; i++) {
      const item = this.extractData(files[i]);
      if (item.data && item.data.length > 0) {
        formatDataList.push(item);
      }
    }
    return invertData(formatDataList);
  }
  public formatter(references: fileWikiLinks[]): string {
    return "## " + this.dataName + "\n\n<details>\n<summary>Show " + this.dataName + "</summary>\n\n" +
      this.format(
        references
          .map(r => this.extractData(r)))
      + "\n\n</details>";
  };
  protected abstract format(references: formatData[]): string;
  public writeHeader(properties: YamlHeaders): string {
    return this.yamlSep + stringify(properties) + this.yamlSep;
  }

		return result;
	}
	public extractData(ref: fileWikiLinks): formatData {
		return {
			...ref,
			name: this.dataName,
			data: ref.matchData[this.dataName],
			bag: [],
		};
	}
	public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
		return invertData(files?.map((ref) => this.extractData(ref)));
	}
	public formatter(references: fileWikiLinks[]): string {
		return (
			"## " +
			this.dataName +
			"\n\n<details>\n<summary>Show " +
			this.dataName +
			"</summary>\n\n" +
			this.format(references.map((r) => this.extractData(r))) +
			"\n\n</details>"
		);
	}
	protected abstract format(references: formatData[]): string;
	public writeHeader(properties: YamlHeaders): string {
		return this.yamlSep + stringify(properties) + this.yamlSep;
	}
}
