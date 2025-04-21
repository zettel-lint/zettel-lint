import { expect, test } from 'vitest';
import { ContextCollector } from '../../ContextCollector';
import { OrphanCollector } from '../../OrphanCollector';
import { TagCollector } from '../../TagCollector';
import { TaskCollector } from '../../TaskCollector';
import { Templator } from '../../Templator';
import { WikiCollector } from '../../WikiCollector';

const full_template = `
---
created: {{created}}
modified: {{modified}}
title: References
---

## Links

<details>
<summary>Show Links</summary>

{{#Links}}{{#value}}
* [{{title}}][{{id}}] = '{{{filename}}}':
  * {{#data}}{{.}}, {{/data}}{{^data}}No links{{/data}}
  * {{#bag}}[{{.}}], {{/bag}}{{^bag}}No backlinks{{/bag}}
{{/value}}{{/Links}}

</details>

## Orphans

<details>
<summary>Show Orphans</summary>

{{#Orphans}}
* {{#value}}[{{title}}][{{id}}]{{/value}} \`{{{key}}}\` : {{#value}}{{#data}}{{.}}, {{/data}}{{/value}}
{{/Orphans}}

</details>

## Contexts

<details>
<summary>Show Contexts</summary>

{{#Contexts}}
* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}}
{{/Contexts}}

</details>

## Tags

<details>
<summary>Show Tags</summary>

{{#Tags}}
* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{^last}}, {{/last}}{{/value}}
{{/Tags}}

</details>

## Tasks

<details>
<summary>Show Tasks</summary>

{{#Tasks}}
* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}}
{{/Tasks}}

</details>

## References

{{#notes}}
[{{id}}]: {{{filename}}} ({{title}})
{{/notes}}`

const full_expected = `
---
created: 2021-01-01T00:00:00.000Z
modified: 2021-01-01T00:00:00.000Z
title: References
---

## Links

<details>
<summary>Show Links</summary>

* [My Project][project] = './project-tasks.md':
  * [work], 
  * No backlinks
* [My Work][work] = './work-tasks.md':
  * No links
  * [project], 

</details>

## Orphans

<details>
<summary>Show Orphans</summary>

* [My Work][work] \`./work-tasks.md\` : [Not a link], [Orphaned link], 

</details>

## Contexts

<details>
<summary>Show Contexts</summary>

* @work => [My Project][project]

</details>

## Tags

<details>
<summary>Show Tags</summary>

* #atag => [My Project][project], [My Work][work], 
* #btag => [My Project][project], 

</details>

## Tasks

<details>
<summary>Show Tasks</summary>

* (A) My important task => [My Work][work]

</details>

## References

[project]: ./project-tasks.md (My Project)
[work]: ./work-tasks.md (My Work)
`

  test('templator creates modified date', () => {
    var sut = new Templator();
    expect(sut.render("{{modified}}")).toContain(new Date(Date.now()).toISOString().substr(0,20)); //ms don't matter
  });

  test('templator can create reference links', () => {
    var sut = new Templator([{id: 'README', wikiname: 'README', filename: './README.md', title: 'Readme', fullpath:'', matchData:{}}]);
    expect(sut.render("{{#notes}}[{{id}}]: {{{filename}}} ({{title}}){{/notes}}", new Date("2021-01-01"), new Date("2021-01-01"))).toBe("[README]: ./README.md (Readme)");
  });

  test('templator can create filter reference links to only those that are used', () => {
    var sut = new Templator([{id: 'README', wikiname: 'README', filename: './README.md', title: 'Readme', fullpath:'', matchData:{}},{id: 'linkToREADME', wikiname: 'linkToREADME', filename: './LinkToREADME.md', title: 'Link to Readme', fullpath:'', matchData:{'WikiCollector': ['README']}}]);
    expect(sut.render("{{#references}}[{{id}}]: {{{filename}}} ({{title}}){{/references}}", new Date("2021-01-01"), new Date("2021-01-01"))).toBe("[README]: ./README.md (Readme)");
  });

  test('templator can create wiki links', () => {
    var sut = new Templator([{id: 'README', wikiname: 'README', filename: './README.md', title: 'Readme', fullpath:'', matchData:{}}]);
    expect(sut.render("{{#notes}}[[{{wikiname}}]]{{/notes}}", new Date("2021-01-01"), new Date("2021-01-01"))).toBe("[[README]]");
  });

  test('templator can create task links', () => {
    var sut = new Templator([{id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing"]}}], [new TaskCollector]);
    expect(sut.render("{{#Tasks}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}}{{/Tasks}}")).toBe("* (A) Do the thing => [My Project][project]");
  });

  test('templator can create multiple task links', () => {
    var sut = new Templator([{id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing", "(B) Do the other thing"]}}], [new TaskCollector]);
    expect(sut.render("{{#Tasks}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}} \n{{/Tasks}}")).toBe("* (A) Do the thing => [My Project][project] \n* (B) Do the other thing => [My Project][project] \n");
  });

  test('templator can filter task links', () => {
    var sut = new Templator([{id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing", "(B) Do the other thing"]}}], [new TaskCollector]);
    expect(sut.render("{{#Tasks}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}} \n{{/Tasks}}")).toBe("* (A) Do the thing => [My Project][project] \n* (B) Do the other thing => [My Project][project] \n");
  });

  test('templator can sort alphabetically', () => {
    var sut = new Templator([{id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing","(C) Do the last thing due:2020-01-01","(B) Do the other thing due:2021-01-01"]}}], [new TaskCollector]);
    expect(sut.render("{{?Tasks?sort()//}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}} \n{{/?Tasks}}")).toBe("* (A) Do the thing => [My Project][project] \n* (B) Do the other thing due:2021-01-01 => [My Project][project] \n* (C) Do the last thing due:2020-01-01 => [My Project][project] \n");
  });

  test('templator can sort by key', () => {
    var sut = new Templator([{id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing","(C) Do the last thing due:2020-01-01","(B) Do the other thing due:2021-01-01"]}}], [new TaskCollector]);
    expect(sut.render("{{?Tasks?sort(due)//}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}} \n{{/?Tasks}}")).toBe("* (C) Do the last thing due:2020-01-01 => [My Project][project] \n* (B) Do the other thing due:2021-01-01 => [My Project][project] \n* (A) Do the thing => [My Project][project] \n");
  });

  test('templator can create multiple tag links', () => {
    var sut = new Templator([{id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tags": ["#atag", "#btag"]}},
        {id: 'work', wikiname: 'work-tasks', filename: './work-tasks.md', title: 'My Work', fullpath:'', matchData:{"Tags": ["#atag"]}}],
        [new TagCollector]);
    expect(sut.render("{{#Tags}}\n* {{key}} : {{#value}}[{{{title}}}][{{id}}],{{/value}}\n{{/Tags}}")).toBe("* #atag : [My Project][project],[My Work][work],\n* #btag : [My Project][project],\n");
  });

  test('templator accepts escape and query operators', () => {
    var sut = new Templator([
        {id: 'work', wikiname: 'work-tasks', filename: './work-tasks.md', title: 'My - (Other) Work', fullpath:'', matchData:{"Contexts": ["@work"]}}],
        [new ContextCollector]);
    expect(sut.enhance("This {{?query//search//}} has an escaped {{`title}}{{/?query}}")).toBe("This {{#query_filter}}{{`query//search//`}} has an escaped {{#markdown_escape}}{{title}}{{/markdown_escape}}{{/query_filter}}");
  });

  test('templator escapes markdown', () => {
    var sut = new Templator([
        {id: 'work', wikiname: 'work-tasks', filename: './work-tasks.md', title: 'My - (Other)side (Work)', fullpath:'', matchData:{"Contexts": ["@work"]}}],
        [new ContextCollector]);
    expect(sut.render("{{#Contexts}}\n* {{key}} : {{#value}}[{{{`title}}}][{{id}}] ({{{`title}}}),{{/value}}\n{{/Contexts}}")).toBe("* @work : [My - &lpar;Other&rpar;side &lpar;Work&rpar;][work] (My - &lpar;Other&rpar;side &lpar;Work&rpar;),\n");
  });

  test.skip('templator accepts @time operator', () => {
    var sut = new Templator([], []);
    expect(sut.enhance("{{@Monday}}* Monday\n{{/@Monday}}{{@Tuesday}}* Tuesday\n{{/@Tuesday}}"))
      .toBe("{{#on}}{{`Monday`}}* Monday\n{{/on}}{{#on}}{{`Tuesday`}}* Tuesday\n{{/on}}");
  });

  test.skip('templator can filter by time', () => { /* Need a better design for this */
    var sut = new Templator([], []);
    expect(sut.render("{{@Monday}}* Monday\n{{/@Monday}}{{@Tuesday}}* Tuesday\n{{/@Tuesday}}", new Date(2021, 6, 1) /*Tuesday*/, new Date(2021, 5, 31) /*Monday*/))
      .toBe("* Monday\n");
  });

  test('full template matches reference', () => {
    var sut = new Templator(
      [ {id: 'project', wikiname: 'project-tasks', filename: './project-tasks.md', title: 'My Project', fullpath:'', 
          matchData:{
            "Tags": ["#atag", "#btag"],
            "Links": ["[work]"],
            "Contexts": ["@work"]}},
        {id: 'work', wikiname: 'work-tasks', filename: './work-tasks.md', title: 'My Work', fullpath:'', 
          matchData:{
            "Tags": ["#atag"],
            "Links": [],
            "Orphans": ["[Not a link]", "[Orphaned link]"],
            "Tasks": ["(A) My important task"]}}],
        [new TagCollector, new TaskCollector, new WikiCollector, new ContextCollector, new OrphanCollector]);
    expect(sut.render(full_template, new Date("2021-01-01"), new Date("2021-01-01"))).toBe(full_expected);
  });
