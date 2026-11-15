import { BaseRule } from "./BaseRule.js";
import { PropertyCollector } from "../collectors/PropertyCollector.js";

export class InlinePropertiesToFrontmatter extends BaseRule {
  readonly name = "inline-properties-to-frontmatter";
  private propertyCollector: PropertyCollector;
  private move: boolean; // New option to control moving vs copying inline properties, should come from command line args
  private regexes: Array<RegExp>;

  constructor(move: boolean = false, regexes: Array<RegExp> = []) {
    super();
    this.move = move;
    this.propertyCollector = new PropertyCollector();
    // Performance optimization: Pre-sanitize global regex patterns once during initialization
    // to avoid re-instantiating non-global RegExp objects for every processed file.
    this.regexes = regexes.map(r => (r.global ? new RegExp(r.source, r.flags.replace('g', '')) : r));
  }

  fix(content: string, filePath: string): string {
    // Collect all properties from both YAML and inline notation
    const propertyCollector = this.propertyCollector.collectProperties(content, this.regexes);
    if (!propertyCollector.hasInline) {
      // If there are no inline properties, nothing to do
      return content;
    }
    
    const properties = propertyCollector.properties;

    // Performance optimization: Single-pass property validation loop avoids
    // multiple Object.keys array allocations, filter, and .some iterator closures.
    let hasProperties = false;
    let hasError = false;
    for (const p in properties) {
      // biome-ignore lint/suspicious/noPrototypeBuiltins: TS target is es2021 so Object.hasOwn cannot be used
      if (!Object.prototype.hasOwnProperty.call(properties, p)) continue;
      hasProperties = true;
      if (!properties[p] || p.length === 0 || p.includes(":")) {
        hasError = true;
        break;
      }
    }

    if (!hasProperties) {
      return content;
    }

    if (hasError) {
      console.warn(`Skipping file ${filePath} due to property collection errors.`);
      return content;
    }

    // Create YAML frontmatter
    const yamlContent = this.propertyCollector.writeHeader(properties);

    // Performance optimization: Fast-path frontmatter check prevents executing regex search
    // on notes that do not start with a YAML frontmatter delimiter.
    var contentWithoutYaml = content.startsWith('---')
      ? content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
      : content;

    // Remove inline properties
    if (this.move) {
      if (this.regexes.length === 0) {
        contentWithoutYaml = contentWithoutYaml.replace(/\[[\w-]+::\s*[^\]]+\]/g, '');
      } else {
        contentWithoutYaml = contentWithoutYaml.replace(/\[([\w-]+)::\s*[^\]]+\]/g, (m, key) =>
          this.regexes.some(r => r.test(key)) ? '' : m
        );
      }
    }

    // Combine new frontmatter with cleaned content
    return `${yamlContent}${contentWithoutYaml.trim()}\n`;
  }
}
