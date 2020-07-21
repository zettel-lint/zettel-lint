#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var clear_1 = __importDefault(require("clear"));
var chalk_1 = __importDefault(require("chalk"));
var figlet_1 = __importDefault(require("figlet"));
var commander_1 = __importDefault(require("commander"));
var glob_1 = __importDefault(require("glob"));
var simple_markdown_1 = __importDefault(require("simple-markdown"));
var fs_1 = __importDefault(require("fs"));
clear_1.default();
console.log(chalk_1.default.red(figlet_1.default.textSync('zettel-lint', { horizontalLayout: 'full' })));
commander_1.default
    .version('0.9.0')
    .description("A linter/compiler for Zettel markdown repositories")
    .option('-d, --daily', "Create daily entry if it doesn't exist")
    .option('-r, --root', "Root pah for search", ".")
    .parse(process.argv);
if (!process.argv.slice(2).length) {
    commander_1.default.outputHelp();
}
// options is optional
glob_1.default(commander_1.default.root + "/**/*.md", { ignore: "**/node_modules/**" }, function (er, files) {
    // files is an array of filenames.
    // If the `nonull` option is set, and nothing
    // was found, then files is ["**/*.js"]
    // er is an error object or null.
    files.forEach(function (file) {
        // TODO : switch to async/await
        var markdownContent = fs_1.default.readFileSync(file).toString();
        console.log(file, simple_markdown_1.default.defaultBlockParse(markdownContent));
    });
});
