import { Command } from '@commander-js/extra-typings';
import { glob } from "glob";
import { promises as fs } from "fs";
import { idFromFilename } from "./file-handling.js";
import { clear } from "console";
import chalk from "chalk";
import figlet from "figlet";
import { collectMatches } from "./RegexCollector.js";
import { exit } from "process";

export default function notesCommand() {
  const notes = new Command('notes');
  notes
    .description("Lint and fix notes markdown files. Will update existing files. (Deprecated, use 'zl fix')")
    .alias("update")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path...>', "Path(s) to ignore")
    .option('-w, --wiki-links-from-id', "Turns [\d*]-style links into [[wiki-links]]")
    .option('-o, --show-orphans', "Output list of orphaned links to console")
    .option('--json-debug-output', "Output JSON intermediate representations")
    .option('--no-wiki', "use [[wiki style]] links")
    .option('-v, --verbose', "Additional output")
    .action((cmdObj) => { lintNotes(cmdObj) })
  return notes;
}

function printHeader(program: any): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-notes', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for notes in " + program.path);
    console.log((program.daily ? "" : "NOT ") + "creating dailies");
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log((program.wikiLinksFromId ? "" : "NOT ") + "converting [id] to [[Wiki-Links]]");
  }
}

function lintNotes(program: any): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**"]; 
  if (program.ignoreDirs) {
    ignoreList = ignoreList.concat(program.ignoreDirs);
  }

  var links: {[id: string]: string} = {};

  function mapWikiLinks(files: string[]) {
    const root = program.path.replace(/\\/g, "/");
    console.log("mapWikiLinks", files[0], program.path, root);
    files.forEach(f => {
      const id = idFromFilename(f);
      if (id && id.trim() !== "") {
        links["[" + id + "]"] = "[[" + f.replace('.md','').replace(root + "/", '') + "]]";
      }
    });
  }

  const linkRegex = /\[\d{8,14}\]/g;
  async function updateLinks(filename: string) {
    try {
      const contents = await fs.readFile(filename, "utf8");
      const matches = collectMatches(contents, linkRegex, false);
      
      let newContents = contents;
      if (matches.length > 0) {
        if(program.verbose) {
          console.log("Found links:", matches);
          matches.forEach(match => console.log("Mapping " + match + " to " + links[match]));
        }
        
        matches.forEach(match => {
          if (links[match]) {
            newContents = newContents.replace(match, links[match]);
          }
        });
      } else if(program.verbose) {
        console.log("No numeric links found in", filename);
      }
      
      await fs.writeFile(filename, newContents);
    } catch (error: any) {
      // Only rethrow if not ENOENT
      console.error(`Error processing file ${filename}:`, error);
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async function parseFiles() {
    printHeader(program);

    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });
    console.log(files.length + " files found");

    mapWikiLinks(files);
    if (program.verbose) {
      console.log("Links:", links);
    }

    for await (const file of files) {
      try {
        await updateLinks(file);
      } catch (error) {
        console.error("Error processing file", file, error);
        throw error;
      }
    }
  }

  parseFiles().catch((err) => {
    console.error(err);
    exit(2);
  });
}