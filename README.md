---

title: Readme
references: [00000001]
notes: YAML top matter is supported

---

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

To refesh index:

* `cd zle`
* `npm i`
* `npm run-script zl -- -r ../ -i "../zle/**" -r ../references.md`

See [example journal](https://github.com/zettel-lint/example) for the style of repo this could be used on.
