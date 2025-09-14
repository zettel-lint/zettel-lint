import { BaseRule } from "./BaseRule.js";
import { PropertyCollector } from "../PropertyCollector.js";

export class InlinePropertiesToFrontmatter extends BaseRule {
  readonly name = "inline-properties-to-frontmatter";
  private propertyCollector: PropertyCollector;
  private move: boolean; // New option to control moving vs copying inline properties, should come from command line args
  private regexes: Array<RegExp>;

  constructor(move: boolean = false, regexes: Array<RegExp> = []) {
    super();
    this.move = move;
    this.propertyCollector = new PropertyCollector();
    this.regexes = regexes;
  }

  fix(content: string, filePath: string): string {
    // Collect all properties from both YAML and inline notation
    const properties = this.propertyCollector.collectProperties(content, this.regexes);
    
    // If no properties found, return content unchanged
    if (Object.keys(properties).length === 0) {
      return content;
    }

    // If properties are null or have errors, log a warnning that we're skipping this file, then return without writing
    if (Object.keys(properties).filter(p => !properties[p]).length > 0
        || Object.keys(properties).some(p => p.includes(":") || p.length === 0)) {
        console.warn(`Skipping file ${filePath} due to property collection errors.`);
        return content;
    }

    // Create YAML frontmatter
    const yamlContent = this.propertyCollector.writeHeader(properties);

    // Remove existing YAML frontmatter if present
    var contentWithoutYaml = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');

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
