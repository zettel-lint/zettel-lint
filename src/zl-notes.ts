import commander from "commander";
import { promise as glob } from "glob-promise";
import { idFromFilename } from "./file-handling";
import { clear } from "console";
import chalk from "chalk";
import figlet from "figlet";

export default function notesCommand() {
  const notes = new commander.Command('notes');
  notes
    .description("Lint and fix notes markdown files")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
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
  var ignoreList = [program.path + "/**/node_modules/**", program.referenceFile]
  if (program.ignoreDirs) {
    ignoreList.push(program.ignoreDirs);
  }

  var links: {[id: string]: string};

  function mapWikiLinks(files: string[]) {
    return files.map(f => links["[" + idFromFilename(f) + "]"] =
       "[[" + f.replace(program.path, '') + "]]");
  }

  async function updateLinks(filename: string) {

  }

  async function parseFiles() {
    printHeader(program);

    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });

    mapWikiLinks(files);
    if (program.verbose) {
      console.log(links);
    }

    for await (const file of files) {
      await updateLinks(file)
    };
  };

  parseFiles().then(
    () => console.log("Updated"),
    () => console.log("Error")
  )
}