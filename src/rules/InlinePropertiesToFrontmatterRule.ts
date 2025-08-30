import { BaseRule } from "./BaseRule.js";
import { PropertyCollector } from "../PropertyCollector.js";

export class InlinePropertiesToFrontmatter extends BaseRule {
  readonly name = "inline-properties-to-frontmatter";
  private propertyCollector: PropertyCollector;
  private move: boolean = true; // New option to control moving vs copying inline properties, should come from command line args

  constructor(move: boolean = false) {
    super();
    this.move = move;
    this.propertyCollector = new PropertyCollector();
  }

  fix(content: string, filePath: string): string {
    // Collect all properties from both YAML and inline notation
    const properties = this.propertyCollector.collectProperties(content);
    
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
    var contentWithoutYaml = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    // Remove inline properties
    if (this.move) {
        contentWithoutYaml = contentWithoutYaml.replace(/\[[\w-]+::\s*[^\]]+\]/g, '');
    }

    // Combine new frontmatter with cleaned content
    return `${yamlContent}${contentWithoutYaml.trim()}\n`;
  }
}
