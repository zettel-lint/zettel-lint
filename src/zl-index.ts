#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { promises as fs } from "fs";
import { Command } from '@commander-js/extra-typings';
import { TaskCollector } from "./TaskCollector.js";
import { ContextCollector } from "./ContextCollector.js";
import { TagCollector } from "./TagCollector.js";
import { WikiCollector } from "./WikiCollector.js";
import { Collector } from "./Collector.js";
import { collectMatches } from "./RegexCollector.js";
import { fileWikiLinks } from "./types.js";
import { idFromFilename } from "./file-handling.js";
import { Templator } from "./Templator.js";
import path from "path";
import { exit } from "process";
import { fileURLToPath } from 'url';
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ZlIndexOptions {
  path: string; // Root path for search
  ignoreDirs: string[] | undefined; // Path(s) to ignore
  referenceFile: string; // Path to output reference.md
  createFile: string; // Path to output file
  templateFile: string; // Path to input mustache template
  showOrphans: boolean; // Output list of orphaned links to console
  taskDisplay: 'none' | 'by-file' | 'by-priority'; // Display tasks
  jsonDebugOutput: boolean; // Output JSON intermediate representations
  wiki: boolean; // Use [[wiki style]] links
  verbose: boolean; // Additional output
  tasksToIssues?: boolean; // New: create GitHub issues from tasks
  [key: string]: any; // Allow additional options
}


export default function indexerCommand() : Command<[], ZlIndexOptions> {
  const idxer = new Command<[], ZlIndexOptions>('index');
  idxer
    .description("Generate index/reference file. Will OVERWRITE any exiting files.")
    .alias("create")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path...>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md", "references.md")
    .option('-c, --create-file <path>', "Path to output file", "references.md")
    .option('-m, --template-file <path>', "Path to input mustache template", path.resolve(__dirname, "references.md.mustache"))
    .option('-o, --show-orphans', "Output list of orphaned links to console", false)
    .option('-t, --task-display <format>', "Display tasks? 'none' 'by-file' 'by-priority'", (value): 'none' | 'by-file' | 'by-priority' => {
      if (!['none', 'by-file', 'by-priority'].includes(value)) {
        throw new Error("Invalid task display format");
      }
      return value as 'none' | 'by-file' | 'by-priority';
    }, "by-file")
    .option('--json-debug-output', "Output JSON intermediate representations", false)
    .option('--no-wiki', "use [[wiki style]] links", false)
    .option('--tasks-to-issues', "Create GitHub issues for each unique task found in the repo", false)
    .option('-v, --verbose', "Additional output", false)
    .action(async (cmdObj: ZlIndexOptions) => { await indexer(cmdObj) })
  return idxer;
}

function printHeader(program: ZlIndexOptions): void {
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
    console.log("Outputting references to " + program.referenceFile);
    console.log("Using template file: " + program.templateFile)
    console.log((program.wiki ? "" : "NOT ") + "using [[Wiki-Links]]");
    console.log("Displaying Tasks " + program.taskDisplay);
  }
}


const collectors: Collector[] = [new WikiCollector, new ContextCollector, new TagCollector, new TaskCollector];

export async function collectFromFile(filename: string, program: any): Promise<fileWikiLinks> {
  const titleReg = /^(?:title:|#) (.*)$/gm; // Without the global, the parser stack overflows

  const contents = await fs.readFile(filename, "utf8");

  var matchData: {[collector: string]: string[]} = {}
  collectors.forEach(element => {
    matchData[element.dataName] = element.collector(filename, contents, program);
  });

  const name = filename.split("/").pop();
  const capturedTitle = collectMatches(contents, titleReg)?.[0];

  return {
    id: idFromFilename(filename),
    filename: name,
    fullpath: filename,
    wikiname: name?.slice(0,-3), // .md
    title: capturedTitle?.length > 0 ? capturedTitle : name?.split(".")[0],
    matchData
  };
}

async function createIssuesFromTasks(tasks: {task: string, file: string, title: string}[], program: ZlIndexOptions) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.error("GITHUB_TOKEN or GITHUB_REPOSITORY not set. Skipping issue creation.");
    return;
  }
  const [owner, repoName] = repo.split("/");
  const fetch = (await import('node-fetch')).default;
  for (const t of tasks) {
    // Check for existing open issues with the same title
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+in:title+${encodeURIComponent(t.task)}`;
    const searchResp = await fetch(searchUrl, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    const searchData = await searchResp.json();
    if (searchData.items && searchData.items.some((i: any) => i.title === t.task && i.state === 'open')) {
      if (program.verbose) console.log(`Issue already exists for: ${t.task}`);
      continue;
    }
    // Create issue
    const url = `https://api.github.com/repos/${owner}/${repoName}/issues`;
    const body = {
      title: t.task,
      body: `Auto-created from task in file: \
${t.file}\n\nSource note title: ${t.title}`
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      if (program.verbose) console.log(`Created issue: ${t.task}`);
    } else {
      const err = await resp.text();
      console.error(`Failed to create issue for: ${t.task}\n${err}`);
    }
  }
}

function indexer(program: ZlIndexOptions): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**", program.referenceFile]
  if (program.ignoreDirs) {
    ignoreList = ignoreList.concat(program.ignoreDirs);
  }


  async function parseFiles() {
    var references: fileWikiLinks[] = [];
    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });
    for await (const file of files) {
      const wikiLinks = await collectFromFile(file, program);
      if (program.referenceFile && wikiLinks.filename && !program.referenceFile.endsWith(wikiLinks.filename)) {
        references.push(wikiLinks);
      }
      if (program.jsonDebugOutput) {
        console.log(wikiLinks);
      }
    }

    if (program.tasksToIssues) {
      // Gather all unique tasks from TaskCollector
      const taskCollector = collectors.find(c => c.dataName === "Tasks") as TaskCollector;
      const allTasks: {task: string, file: string, title: string}[] = [];
      for (const ref of references) {
        const tasks = ref.matchData["Tasks"] || [];
        for (const t of tasks) {
          allTasks.push({task: t.trim(), file: ref.filename || '', title: ref.title || ''});
        }
      }
      // Remove duplicates by task text
      const seen = new Set();
      const uniqueTasks = allTasks.filter(t => {
        if (seen.has(t.task)) return false;
        seen.add(t.task);
        return true;
      });
      await createIssuesFromTasks(uniqueTasks, program);
      return;
    }

    if (program.referenceFile && program.templateFile) {
      // Ensure the directory for the reference file exists
      const refDir = path.dirname(program.referenceFile);
      await fs.mkdir(refDir, { recursive: true });

      const template = await fs.readFile(program.templateFile, "utf8");
      const templator = new Templator(references, collectors);
      if (program.verbose) {
        console.log(templator.enhance(template));
      }
      const formatted = templator.render(template);

      await fs.writeFile(program.referenceFile, formatted);
    } else {
      console.error("No output or template file found. Exiting.");
      exit(1);
    }
  }

  parseFiles().then(
    () => { if (program.verbose) { console.log("Updated") } },
    (reason) => { console.error("Error: " + reason); exit(2); }
  )
}