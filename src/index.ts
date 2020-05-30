#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import program from "commander";
import {promise as glob} from "glob-promise";
import SimpleMarkdown from "simple-markdown";
import {promises as fs} from "fs";
import { networkInterfaces } from "os";

program
  .version('0.9.0')
  .description("A linter/compiler for Zettel markdown repositories")
  .option('-d, --daily', "Create daily entry if it doesn't exist")
  .option('-p, --path <path>', "Root path for search", ".")
  .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
  .option('-r, --reference-file <path>', "Path to output reference.md")
  .option('-o, --show-orphans', "Output list of orphaned links to console")
  .option('--no-wiki', "use [[wiki style]] links")
  .option('-v, --verbose', "Verbose")
  ;

program
  .parse(process.argv);

if (program.verbose) {
  clear();
  console.log(
      chalk.red(
        figlet.textSync('zettel-lint', { horizontalLayout: 'full' })
      )
    );
  console.log("Looking for notes in " + program.path);
  console.log((program.daily ? "" : "NOT ") + "creating dailies");
  console.log("Ignoring dirs: " + program.ignoreDirs);
  console.log("Outputting references to " + program.referenceFile)
}

async function readMarkdown(filename: string) {
  const markdownContent = await fs.readFile(filename).toString();
  console.log(filename, SimpleMarkdown.defaultBlockParse(markdownContent));
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
  matches: string[] = [];
  orphans: string[] = [];
  tags: string[] = [];
  tasks: string[] = [];
}

class extractor {
  matcher!: RegExp;
  formatter!: (i: fileWikiLinks[]) => string;
}

const formatters: extractor[] = [
  {
    matcher: /[ ^](#[a-zA-z0-9]+)/g,
    formatter: (references) => "## Tags\n\n" +
    (references
      .filter(r => r.tags.length > 0)
      .map(r => "* [" + r.id + "] = " + r.filename + ":" + r["tags"]).join("\n"))
  }
]

function collectMatches(contents: string, regex: RegExp, useCaptureGroup: boolean = true) : string[] {
  var result : string[] = [];
  var next : RegExpExecArray | null;
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

async function readWikiLinks(filename: string) : Promise<fileWikiLinks> {
  const wikiLink = /\[\d{8,14}\]/g;
  const brokenWikiLink = /\[[a-zA-Z0-9\[]+[a-zA-Z ]+.*\][^\(]/g;
  const tagLink = /[ ^](#[a-zA-z0-9]+)/g;
  const titleReg = /^title: (.*)$/gm;
  const todo = /^[\s\*]*\[ \].*$/gm;
  const projectTasks = /^.*[ ^]\+\d{8,14}.*$/gm;

  const contents = await fs.readFile(filename, "utf8");

  return {
    id : idFromFilename(filename),
    filename : filename.split("/").pop(),
    fullpath : filename,
    matches : collectMatches(contents, wikiLink),
    orphans : collectMatches(contents, brokenWikiLink),
    tags : collectMatches(contents, tagLink),
    title : collectMatches(contents, titleReg).join(),
    tasks : collectMatches(contents, todo).concat(collectMatches(contents, projectTasks))
  };
}

var ignoreList = [program.path + "/**/node_modules/**"]
if (program.ignoreDirs) {
  ignoreList.push(program.ignoreDirs);
}

async function parseFiles() {
  var references : fileWikiLinks[] = [];

  // options is optional
  const files = await glob(program.path + "/**/*.md", {ignore: ignoreList});

  for await (const file of files) {
    const wikiLinks = await readWikiLinks(file);
    if (program.referenceFile && !program.referenceFile.endsWith(wikiLinks.filename)) {
      references.push(wikiLinks);
    }
    if (program.verbose) {
      console.log(wikiLinks);
    }
    if (program.showOrphans && wikiLinks.orphans.length > 0) {
      console.log(wikiLinks.filename + " (orphans) : " + wikiLinks.orphans);
    }
  };

  if (program.referenceFile) {
    const header = "---" +
    "\ncreated: " + (new Date()).toISOString() +
    "\nmodified: " + (new Date()).toISOString() +
    "\ntitle: References" +
    "\n---" +
    "\n\n# References";
    const formattedReferences = header  + 
      "\n\n## Links\n\n" + 
      references.map(r => "* [" + r.id + "] = " + r.filename + ":" + r.matches).join("\n") +
      "\n\n" +
      formatters[0].formatter(references) +
      "\n\n## Tasks" +
      references
        .filter(r => r.tasks.length)
        .map(r => "\n\n### " + r.title + " [" + r.filename + "](./" + r.filename + "):\n\n* " + r.tasks.join("\n* ")) +
      (program.showOrphans ?
        "\n\n## Orphans\n\n" +
        references
          .filter(r => r.orphans.length > 0)
          .map(r => "* " + r.filename + ": " + r.orphans.join()).join("\n")
        : "") +
      "\n\n## Backlinks\n\n" +
      references.map(r => "[" + r.id + "]: ./" + r.filename + (r.title ? " (" + r.title + ")" : "")).join("\n")
      ;

    if(program.verbose) {
      console.log("references :" + formattedReferences);
    }
    fs.writeFile(program.referenceFile, formattedReferences);
  };
};

parseFiles().then(
  () => console.log("Updated"),
  () => console.log("Error")
)
