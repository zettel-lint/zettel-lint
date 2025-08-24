---
title: vision - (my frustrations and goals) - & roadmap
created: 2020-10-11 21:48
---

There are many editors and extensions for working with connected markdown files. As I am working on multiple devices, 
it's hard to find a single editor that works on all of them, and different editors are optimised for different
things. In the spirit of UNIX, therefore, I wanted to write a suite of small programs (here coded as sub-commands)
that will allow the connection and management of markdown files via automated processes, such as github actions, so
that the knowledge base can be updated from anywhere.

This tool was originally created to manage a zettelkasten based markdown powered git repository.

## Principles

* All outputs should use standard formats, mostly markdown, but some usages may need something more specific.
* All subcommands should be independent so that users can pick and choose whatever suits them.
* Modifications aligned to particular practices (e.g. GTD, Zettelkasten, bujo) should live in their own subcommands.
* This tool should not impose structure on the knowledge base.
* Repeated application of a subcommand should only modify the knowledge base at most once, unless external factors apply
  * External factors include time triggers, update of import files

