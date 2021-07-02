---
modified: 2020-08-04T20:11:41+01:00
---

# Zettel Linter

Is this actually a suite of tools?

Uses [commander](https://github.com/tj/commander.js) for CLI parsing

* Linker:
  * Backlinks tracker (references.md)
  * Wikilink updater
  * 3rd party integrations
  * Optionally create new pages on thr fly
* Task tracker/GTD/#BuJo:
  * repeating tasks
  * snoozed tasks
  * move tasks between wiki & todo.txt
  * goal tracker
* Note management:
  * meta notes (TODO, DONE, tags)
  * templates

## Alternatives

* (✔) Look at useful VS Code extensions
  * MZettel
  * todotxt mode
  * [Markdown Links to graph connections](https://marketplace.visualstudio.com/items?itemName=tchayen.markdown-links)
  * [Markdown Lint](https://github.com/DavidAnson/vscode-markdownlint#configure)
* (E) See [FOAM](https://foambubble.github.io/foam/) for VS Code-based solution

## `zl *` Tasks

* (C) Should take seconds to run, at most, on 10000 file example repo 
* (E) Add tests for regex

## `zl graph` Tasks

* (E) Task tracker - tasks completed per day
* (Y) Export link as [a flowchart](https://mermaid-js.github.io/mermaid/#/flowchart) - see also Name: [Markdown Links](https://marketplace.visualstudio.com/items?itemName=tchayen.markdown-links) - this may be easier under indexer?

## `zl kanban` Tasks

* (F) Kanban view for Trello-imported notes, one md per board, with tables

## `zl index` Tasks

* x 2021-07-01 (A) Use better regex for filter parsing, to support complex internal regex
* (B) Grep for orphaned + links across all files (including .txt)
* x 2021-07-01 (B) link checker should support wiki-link syntax
* (B) Task list should include `*.txt` except `done*.txt` (or configurable exclude glob for non-English users)
* x 2021-07-01 (C) Show tags in top section next to links and backlinks
* (D) "Soft references" that match filename should show below backlinks - needs to be fast
* (F) Highlight orphaned links and offer to create page 
* (G) Task sort options: ~~By Project (i.e. filename, or by + annotations)~~, ~~by due date~~, ~~by start date~~, ~~by priority~~, ~~alphabetically~~, by context (@ symbols), by List (if multiple `## Tasks` per file)
* (G) Allow prefix links (e.g. only link to day, not day time) if the prefix is unambiguous 
* (G) Format Trello boards as Tables of Content, not 2d tables? 
* (H) Sort all tasks by priority then due date (cli options for this?) - letters, then checkbox then others 
* x 2021-07-01 (H) Use first # Title or title: as the title in `zl index` 
* (H) Create indexer for notes with a list: header for blogging/Trello imports. 
* x 2021-07-01 (I) Option to generate separate index, tag, orphan, etc. files - each type has a file arg, but all can use references.md for current behaviour
* (L) Add anchored links from pages with tags to a collection page, and generate tag meta pages alongside references.md `tag-blog.md` for example (can then use these instead of a separate tag section in references?)

## `zl notes` Tasks

* (C) *-Daily files should have a title like YYYY-MM-DD
* (C) Allow prefix links (e.g. only link to day, not day time) if the prefix is unambiguous
* (C) Allow timestamp ids, with or without dashes, and match file that starts with that id, with whatever following content is meaningful
* (D) Find "Related notes" - grep for note title, tags (without #) and any titles within new notes 
* (D) accept filename list (e.g. changed since last commit) and only process those
* (D) Don't try and save file on the fly. collect references then dump in a writefile at the end
* (D) Find and link dates to dailies 
* (E) Expand prefix links (e.g. only link to day, not day time) to canonical form if the prefix is unambiguous
* (E) Turn [Titles] links into [[xxxxxxxxxxxxx]] links
* (E) Extend classes to support notes
* (H) Output links to `## Links` section at bottom of each note : only needed if not using wiki-links 
* (J) Automatically add yaml header to notes 
* (L) Support pages in a hierarchy, but allow page links to only reference leaf text (use namespacing rules)
* (P) Automatically generate bi-directional links when saving/committing markdown files

## `zl cron` Tasks

* **`zl cron` isn't a thing - it should be cronned by external. `zl template` and others instead** 
* (E) send daily tasks email (todo.txt, waiting.txt, due: ) every night
* (E) Send "Related notes" email / add to daily for each file recently added 
* (M) Automatically copy #Recurring #Template into new notes (use `recurrence-frequency:` header?)
* x 2021-07-01 (M) Templates that can be copied 
* (X) Automatically generate "today" file in `daily` folder if it doesn't exist 
* (Y) Automatically pull in tasks `due:2020-05-19` into the daily journal, as a checklist, in a #ToDo section 
* (Y) Sync checklist from journal back to todo.txt file? 
* (Y) Add an email action when the daily is created 
* (Z) Folders for journal use `daily/year/month/day` for cleaner organisation & limit file count
* (Z) Bullet journal mode ; :warning::small_orange_diamond::negative_squared_cross_mark::arrow_right::arrow_left::radio_button: etc 

## `zl todo` Tasks (to lint/update todo.txt and related files)

* (C) Daily Todo.txt full and done.txt diff email from GitHub
* (D) Check all +links are followed by a valid note:link 
* (E) Archive anything older than 7 days in done.txt 
* (E) Add quick ability to add other tasks? 
* (F) Generate Todo.txt compatible files (is there a `.md` version?) 
* (F) Allow todo.txt style projects to link to note +project-link
* (G) Interactive mode : select tasks for daily 
* (H) Move completed tasks from archive to daily log 
* (L) Highlight 5 Minute Tasks 

## `zl import` Tasks

(One way only)

* [Trello import](https://developer.atlassian.com/cloud/trello/rest/#api-cards-id-actions-get)
  * (B) Re-write Trello links as references on import 
  * (B) Import to import card as note (current default), list as note, or board as note
* (D) Simplenote import 
* (E) Evernote import 
* (F) Wordpress import 
* (H) Pocket import 
* (I) OneNote import 
* (Y) The Journal import 

## `zl export` Tasks

* (B) Export tasks to github issues
* (C) Export tasks to CSV
* (C) Export tasks to iCal using due:dates
* (D) Export tasks to Trello
* (E) Export tasks to Google Tasks
* (F) Export tasks to Microsoft/Outlook Tasks

## `zl linter` Tasks

* (C) Highlight pages that don't follow filename convention 
* (D) Turn tags into notes
* (D) Tidy up imported tasks

## Advanced options Tasks

* (D) Option: Allow cover image via md syntax? 
* (G) Option : Extensions for GTD and bullet journal workflows 
* (J) Option : cross-repo links? 
* (W) Option : Allow colour 
* (Y) Option : auto-update links to Github issues, Trello tasks etc. (ask for community extensions) 

## Tasks

