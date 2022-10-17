# Contributing to the project

## Code of Conduct

Please accept the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md) before contributing to this project.

## Getting Started

This project uses Node and Typescript, and is run from the command line, using the `commander.js` package. Contributors should be familiar with the UNIX-based command line, and with the `git` version control system.

Developers should also be familiar with the [example journal](https://github.com/zettel-lint/example) repository, which is used for testing.

## Running the tests

The tests are written using the `jest` framework, and can be run using the `npm test` command, or via the jest runner in VS Code and other editors. The tests are run automatically on each commit using GitHub Actions, using node v12, v14 and v16. Older versions of node are not supported, due to dependencies.

New features should all have associated tests, and should not break existing tests. I will accept PRs that purely add test coverage, but will not accept PRs that break existing tests.

## Code structure

The [zl.ts](src/zl.ts) file is the entry point for the command line tool. It uses the `commander.js` package to parse the command line arguments, and then calls the appropriate function from the zl-* files. The `zl-*` files are named after the command line arguments, and are responsible for the actual work of the command.

### `zl-index`

The [zl-index.ts](src/zl-index.ts) file is responsible for the `index` command (alias `create`), which is used to create new files that reference other files in the repository. Each markdown file in the repository is processed by a series of collectors, which look for specific features in the file. The collectors are:

- [Collector](src/collectors/collector.ts) - the base class for all collectors
  - [RegexCollector](src/collectors/regex-collector.ts) - a collector that uses a regular expression to find matches
    - [ContextCollector](src/collectors/context-collector.ts) - a collector that looks for `@Context` GTD-style references
    - [OrphanCollector](src/collectors/orphan-collector.ts) - a collector that looks for links to files that don't exist
    - [TagCollector](src/collectors/tag-collector.ts) - a collector that looks for `#hashtag` and GTD-style `+project` references
    - [TaskCollector](src/collectors/task-collector.ts) - a collector that looks for `[ ] Tasks` and `(A) todo.txt style` references
    - [WikiCollector](src/collectors/wiki-collector.ts) - a collector that looks for `[[WikiLinks]]` and Zettelkasten-style `[yymmddhhmmss]` references

Once the input files have been processed, the [Templator](src/Templator.ts) uses `mustache` to render the output file, using the data collected by the collectors, and some additional annotations to support filtering notes `{{``tag[filter]``}}` and escaping markdown characters.

### `zl-import`

A general framework for importing notes from other platforms, but the only currently supported platform is Trello via the Board > Export and JSON format. Each card in Trello is exported to a new note, with the card title as the note title, and the card description as the note body. The note is placed in a folder named after the board, and the note is tagged with the list name.

This is not designed for 2-way sync. I have some ideas for how to do that, but it's not a priority for me right now, and will be a separate command.

### `zl-notes`

This is for tidying up existing notes, either from import, or to maintain internal consistency. At the moment it only supports the option to turn Zettelkasten-style `[yyyymmddhhmmss]` links into WikiLinks `[[like-this]]`.

## Tasks

The most important tasks are listed and prioritised in the GitHub issues for the project. If you want to contribute, please pick an issue and comment on it to let me know you're working on it. If you have an idea for a new feature, please open a new issue to discuss it.

There's also some lower priority tasks in the [tasks](tasks.md) file which will be migrated to GitHub issues at some point. I welcome any contributions that will help me to migrate these.