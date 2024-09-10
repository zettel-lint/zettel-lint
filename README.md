---

title: Readme
references: [00000001]
notes: YAML top matter is supported

---

If you are a coder and watch to submit a PR, please see the [Contributor guide](CONTRIBUTING.md) [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

If you are not a confident coder and would like to contribute please [look at the task list](tasks.md). I will accept PRs that add issues from that file and update the md to point to them, so long as you at least do all the tasks in a section.

## ZL

![Node.js CI](https://github.com/zettel-lint/zettel-lint/workflows/Node.js%20CI/badge.svg)

A linter/compiler for markdown-based Zettelkasten git repositories

Based on the [Zettelkasten method](https://zettelkasten.de/)

This is a link to a [Page that doesn't exist](404.md)

[This is a link to a page that doesn't exist - an orphan]

[00000000] points back here

[ ] This is a task

[x] This completed task is ignored

* [ ] Also supports tasks in a bullet list
* [x] if they aren't completed

Tags can use #hashtag or +projectref formats for compatibility with `todo.txt` files

To refresh index:

* `cd zle`
* `npm i`
* `npm run-script zl -- -r ../ -i "../zle/**" -r ../references.md`

This will use the `references.md.mustache` as the template for the references file.

See [example journal](https://github.com/zettel-lint/example) for the style of repo this could be used on.

## Templating

Some features accept a mustache based template to generate their output.

For the indexer, there is a `{{#notes}}` collection with all notes, as well as a collection named after each collector.

Each collector looks for specific features. For example, the TagCollector looks for #hashtag and +project references, the TaskCollector looks for `[ ] Tasks` or `(A) todo.txt style`

Each note has the following properties:

* `id` - the unique internal id (usually the timestamp from the filename)
* `filename`
* `wikiname` - filename without the last 3 characters, which turns a `.md` file into its wiki reference.
* `title` - taken from YAML top matter, the first `# H1 header` or the filename, in that order
* `data` - the collection of matches by this collector in this file

### Template extensions

* `{{``markdownEscaping}}` Using the backtick at the start of the tag will escape any markdown characters into an HTML escaped version.
* `{{?tag[filter]}}{{/?tag}}` Using a ? at the start of a tag pair will filter any output using the specified regular expression.
