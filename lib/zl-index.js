#!/usr/bin/env node
"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const clear_1 = __importDefault(require("clear"));
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = __importDefault(require("commander"));
const glob_promise_1 = require("glob-promise");
const simple_markdown_1 = __importDefault(require("simple-markdown"));
const fs_1 = require("fs");
commander_1.default
    .version('0.9.0')
    .description("A linter/compiler references generator for Zettel markdown repositories")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md")
    .option('-o, --show-orphans', "Output list of orphaned links to console")
    .option('--json-debug-output', "Output JSON intermediate representations")
    .option('--no-wiki', "use [[wiki style]] links")
    .option('-v, --verbose', "Verbose");
commander_1.default
    .parse(process.argv);
if (commander_1.default.verbose) {
    clear_1.default();
    console.log(chalk_1.default.red(figlet_1.default.textSync('zettel-lint-index', { horizontalLayout: 'full' })));
    console.log("Looking for notes in " + commander_1.default.path);
    console.log((commander_1.default.daily ? "" : "NOT ") + "creating dailies");
    console.log("Ignoring dirs: " + commander_1.default.ignoreDirs);
    console.log("Outputting references to " + commander_1.default.referenceFile);
}
async function readMarkdown(filename) {
    const markdownContent = await fs_1.promises.readFile(filename).toString();
    console.log(filename, simple_markdown_1.default.defaultBlockParse(markdownContent));
}
function idFromFilename(filename) {
    const nameOnly = filename.split("/").pop();
    const withoutExt = nameOnly === null || nameOnly === void 0 ? void 0 : nameOnly.split(".")[0];
    return withoutExt === null || withoutExt === void 0 ? void 0 : withoutExt.split("-")[0];
}
class fileWikiLinks {
    constructor() {
        this.matches = [];
        this.orphans = [];
        this.tags = [];
        this.tasks = [];
    }
}
class extractor {
}
const formatters = [
    {
        matcher: /[ ^](#[a-zA-z0-9]+)/g,
        formatter: (references) => "## Tags\n\n" +
            (references
                .filter(r => r.tags.length > 0)
                .map(r => "* [" + r.id + "] = " + r.filename + ":" + r["tags"]).join("\n"))
    }
];
function collectMatches(contents, regex, useCaptureGroup = true) {
    var result = [];
    var next;
    do {
        next = regex.exec(contents);
        if (next) {
            if (useCaptureGroup && next[1]) {
                result.push(next[1].trim());
            }
            else {
                result.push(next.toString().trim());
            }
        }
    } while (next);
    return result;
}
async function readWikiLinks(filename) {
    const wikiLink = /\[\d{8,14}\]/g;
    const brokenWikiLink = /\[[a-zA-Z0-9\[]+[a-zA-Z ]+.*\][^\(]/g;
    const tagLink = /[ ^](#[a-zA-z0-9]+)/g;
    const titleReg = /^title: (.*)$/gm;
    const todo = /^[\s\*]*\[ \].*$/gm;
    const projectTasks = /^.*[ ^]\+\d{8,14}.*$/gm;
    const contents = await fs_1.promises.readFile(filename, "utf8");
    return {
        id: idFromFilename(filename),
        filename: filename.split("/").pop(),
        fullpath: filename,
        matches: collectMatches(contents, wikiLink),
        orphans: collectMatches(contents, brokenWikiLink),
        tags: collectMatches(contents, tagLink),
        title: collectMatches(contents, titleReg).join(),
        tasks: collectMatches(contents, todo).concat(collectMatches(contents, projectTasks))
    };
}
var ignoreList = [commander_1.default.path + "/**/node_modules/**"];
if (commander_1.default.ignoreDirs) {
    ignoreList.push(commander_1.default.ignoreDirs);
}
async function parseFiles() {
    var e_1, _a;
    var references = [];
    // options is optional
    const files = await glob_promise_1.promise(commander_1.default.path + "/**/*.md", { ignore: ignoreList });
    try {
        for (var files_1 = __asyncValues(files), files_1_1; files_1_1 = await files_1.next(), !files_1_1.done;) {
            const file = files_1_1.value;
            const wikiLinks = await readWikiLinks(file);
            if (commander_1.default.referenceFile && !commander_1.default.referenceFile.endsWith(wikiLinks.filename)) {
                references.push(wikiLinks);
            }
            if (commander_1.default.jsonDebugOutput) {
                console.log(wikiLinks);
            }
            if (commander_1.default.showOrphans && wikiLinks.orphans.length > 0) {
                console.log(wikiLinks.filename + " (orphans) : " + wikiLinks.orphans);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (files_1_1 && !files_1_1.done && (_a = files_1.return)) await _a.call(files_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    ;
    if (commander_1.default.referenceFile) {
        const header = "---" +
            "\ncreated: " + (new Date()).toISOString() +
            "\nmodified: " + (new Date()).toISOString() +
            "\ntitle: References" +
            "\n---" +
            "\n\n# References";
        const formattedReferences = header +
            "\n\n## Links\n\n" +
            references.map(r => "* [" + r.id + "] = " + r.filename + ":" + r.matches).join("\n") +
            "\n\n" +
            formatters[0].formatter(references) +
            "\n\n## Tasks" +
            references
                .filter(r => r.tasks.length)
                .map(r => "\n\n### " + r.title + " [" + r.filename + "](./" + r.filename + "):\n\n* " + r.tasks.join("\n* ")) +
            (commander_1.default.showOrphans ?
                "\n\n## Orphans\n\n" +
                    references
                        .filter(r => r.orphans.length > 0)
                        .map(r => "* " + r.filename + ": " + r.orphans.join()).join("\n")
                : "") +
            "\n\n## Backlinks\n\n" +
            references.map(r => "[" + r.id + "]: ./" + r.filename + (r.title ? " (" + r.title + ")" : "")).join("\n");
        if (commander_1.default.jsonDebugOutput) {
            console.log("references :" + formattedReferences);
        }
        fs_1.promises.writeFile(commander_1.default.referenceFile, formattedReferences);
    }
    ;
}
;
parseFiles().then(() => console.log("Updated"), () => console.log("Error"));
