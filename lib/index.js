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
clear_1.default();
console.log(chalk_1.default.red(figlet_1.default.textSync('zettel-lint', { horizontalLayout: 'full' })));
commander_1.default
    .version('0.9.0')
    .description("A linter/compiler for Zettel markdown repositories")
    .option('-d, --daily', "Create daily entry if it doesn't exist")
    .parse(process.argv);
if (!process.argv.slice(2).length) {
    commander_1.default.outputHelp();
}
