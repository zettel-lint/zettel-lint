#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const clear_1 = __importDefault(require("clear"));
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = __importDefault(require("commander"));
commander_1.default
    .version('0.9.0')
    .description("A linter/compiler for Zettel markdown repositories")
    .command("cron <cron-mode-args>", "Create daily entry if it doesn't exist")
    .option('-v, --verbose', "Verbose")
    .command("index <index-mode-args>", "Generate index/reference file");
commander_1.default
    .parse(process.argv);
if (commander_1.default.verbose) {
    clear_1.default();
    console.log(chalk_1.default.red(figlet_1.default.textSync('zettel-lint', { horizontalLayout: 'full' })));
}
