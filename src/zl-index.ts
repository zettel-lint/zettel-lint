#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { promise as glob } from "glob-promise";
import { promises as fs } from "fs";
import commander from "commander";

export default function indexerCommand() {
  const idxer = new commander.Command('index');
  idxer
    .description("Generate index/reference file")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md")
    .option('-o, --show-orphans', "Output list of orphaned links to console")
    .option('--json-debug-output', "Output JSON intermediate representations")
    .option('--no-wiki', "use [[wiki style]] links")
    .option('-v, --verbose', "Additional output")
    .action((cmdObj) => { indexer(cmdObj) })
  return idxer;
}

function printHeader(program: any): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-index', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for notes in " + program.path);
    console.log((program.daily ? "" : "NOT ") + "creating dailies");
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log("Outputting references to " + program.referenceFile)
  }
}

function idFromFilename(filename: string) {
  const nameOnly = filename.split("/").pop();
  const withoutExt = nameOnly?.split(".")[0];
  return withoutExt?.split("-")[0];
}

class fileWikiLinks {
  id: string | undefined;
  title: string | undefined;
  filename: string | undefined;
  fullpath: string | undefined;
  matchData: {[collector: string]: string[]} = {};
}

class formatData {
  id: string | undefined;
  title: string | undefined;
  filename: string | undefined;
  fullpath: string | undefined;
  data: string[] = [];
}

class extractor {
  matcher!: RegExp;
  formatter!: (i: fileWikiLinks[]) => string;
}

function collectMatches(contents: string, regex: RegExp, useCaptureGroup: boolean = true): string[] {
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

abstract class Collector
{
  abstract readonly dataName: string;
  public abstract collect(content: string): string[];
  private extractData(ref: fileWikiLinks): formatData {
    return {
      ...ref,
      data: ref.matchData[this.dataName] 
    };
  };
  public formatter(references: fileWikiLinks[]): string {
    return "## " + this.dataName + "\n\n<details>\n<summary>Show "+ this.dataName + "</summary>\n\n" +
    this.format(
      references
      .map(r => this.extractData(r)))
      +"\n\n</details>";
  };
  protected abstract format(references: formatData[]): string;
}                                                

abstract class RegexCollector extends Collector
{
  readonly abstract regex = / /g;
  /**
   * collect
   */
  public collect(content: string): string[] {
      return collectMatches(content, this.regex);
  }
}

class WikiCollector extends RegexCollector
{
  protected format(references: formatData[]): string {
    var backList : {[target:string]: string[]} = invertDictionary(references);

    return references.map(r => "* " + formatLink(r) + " = `" + r.filename + "`:\n  * " + (r.data.length > 0 ? r.data : "No links") + "\n  * " + (backList["[" + (r.id ?? "") + "]"] ?? "No backlinks")).join("\n");
  }
  readonly dataName = "Links";
  readonly regex = /\[\d{8,14}\]/g;
}

class OrphanCollector extends RegexCollector
{
  protected format(references: formatData[]): string {
    return references
        .filter(r => r.data.length > 0 && r.id !== undefined)
        .map(r => "* " + formatLink(r) + " `" + r.filename + "`: " + r.data.join()).join("\n");
  }
  readonly dataName = "Orphans";
  readonly regex = /\[[a-zA-Z0-9\[]+[a-zA-Z ]+.*\][^\(]/g;
}

class TagCollector extends RegexCollector
{
  protected format(references: formatData[]): string {
    var tagList : {[tag:string]: string[]} = invertDictionary(references);

    var result : string = "";
    Object.keys(tagList).forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result
    };
  readonly dataName = "Tags";
  readonly regex = /[ ^](#[a-zA-z0-9]+)/g;
}

class ContextCollector extends RegexCollector
{
  protected format(references: formatData[]): string {
    var tagList: { [tag: string]: string[]; } = invertDictionary(references);

    var result : string = "";
    Object.keys(tagList).forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result
    };
  readonly dataName = "Contexts";
  readonly regex = /[ ^](\@[a-zA-z0-9]+)/g;
}

class TaskCollector extends RegexCollector
{
  protected format(references: formatData[]): string {
    return "" +
      references
      .filter(r => r.data.length > 0)
      .map(r => "\n\n### " + r.title + " [" + r.filename + "](./" + r.filename + "):\n\n<details>\n\n* " + r.data.join("\n* ")+"\n\n</details>").join("\n")
  }
  readonly dataName = "Tasks";
  readonly regex = /^[\s\*]*((?:(?:\[ \])|(?:\([A-Z]\))).*)$/gm;
  readonly projectTasks = /^.*[ ^]\+\d{8,14}.*$/gm;
  
  public collect(content:string): string[] {
    return super.collect(content).concat(collectMatches(content, this.projectTasks));
  }
}

const collectors: Collector[] = [new WikiCollector, new OrphanCollector, new ContextCollector, new TagCollector, new TaskCollector];

function invertDictionary(references: formatData[]) {
  var tagList: { [tag: string]: string[]; } = {};

  references.forEach(ref => {
    const tags = ref.data;
    tags.forEach(tag => {
      if (tagList[tag] === undefined) {
        tagList[tag] = [];
      }
      tagList[tag].push(formatLink(ref));
    });
  });
  return tagList;
}

function formatLink(ref: formatData): string {
  return "["+ref.title+"][" + ref.id + "]";
}

async function collectFromFile(filename: string): Promise<fileWikiLinks> {
  const titleReg = /^title: (.*)$/gm;

  const contents = await fs.readFile(filename, "utf8");

  var matchData: {[collector: string]: string[]} = {}
  collectors.forEach(element => {
    matchData[element.dataName] = element.collect(contents);
  });

  const name = filename.split("/").pop();

  return {
    id: idFromFilename(filename),
    filename: name,
    fullpath: filename,
    title: collectMatches(contents, titleReg).join() ?? name,
    matchData
  };
}

function indexer(program: any): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**"]
  if (program.ignoreDirs) {
    ignoreList.push(program.ignoreDirs);
  }

  async function parseFiles() {
    var references: fileWikiLinks[] = [];

    // options is optional
    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });

    for await (const file of files) {
      const wikiLinks = await collectFromFile(file);
      if (program.referenceFile && !program.referenceFile.endsWith(wikiLinks.filename)) {
        references.push(wikiLinks);
      }
      if (program.jsonDebugOutput) {
        console.log(wikiLinks);
      }
    };

    if (program.referenceFile) {
      const header = "---" +
        "\ncreated: " + (new Date()).toISOString() +
        "\nmodified: " + (new Date()).toISOString() +
        "\ntitle: References" +
        "\n---" +
        "\n\n# References" +
        "\n\n";

      const formattedReferences = header +
        collectors
          .filter(c => program.showOrphans || c.dataName !== "orphans")
          .map(c => c.formatter(references)).join("\n\n") +
        "\n\n## References\n\n" +
        references.map(r => "[" + r.id + "]: ./" + r.filename + (r.title ? " (" + r.title + ")" : "")).join("\n")
        ;

      if (program.jsonDebugOutput) {
        console.log("references :" + formattedReferences);
      }
      fs.writeFile(program.referenceFile, formattedReferences);
    };
  };

  parseFiles().then(
    () => console.log("Updated"),
    () => console.log("Error")
  )
}