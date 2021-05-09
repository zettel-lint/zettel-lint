import { TagCollector } from '../../TagCollector';
import { TaskCollector } from '../../TaskCollector';
import { Templator } from '../../Templator';

const full_template = `
---
created: {{created}}
modified: {{modified}}
title: References
---

## Links

<details>
<summary>Show Links</summary>

{{#notes}}
* [{{name}}][{{id}}] = '{{filename}}':
  * {{#links}}[{{id}}], {{/links}}{{^links}}No links{{/links}}  
  * {{#backlinks}}[{{id}}], {{/backlinks}}{{^backlinks}}No backlinks{{/backlinks}}  
{{/notes}}

</details>

## Orphans

<details>
<summary>Show Orphans</summary>

{{ Not sure orphans are useful/correct? }}

</details>

## Contexts

<details>
<summary>Show Contexts</summary>

{{#contexts}}
* {{name}} : {{#notes}}[title][id],{{/notes}}
{{/contexts}}

</details>

## Tags

<details>
<summary>Show Tags</summary>

{{#tags}}
* {{name}} : {{#notes}}[title][id],{{/notes}}
{{/tags}}

</details>

## Tasks

<details>
<summary>Show Tasks</summary>

{{#tasks}}
* {{name}} => {{#note}}[title][id],{{/note}}
{{/tasks}}

</details>

## References

{{#notes}}
[{{id}}]: {{filename}} ({{title}})
{{/notes}}`

test('templator creates modified date', () => {
    var sut = new Templator();
    expect(sut.render("{{modified}}")).toContain(new Date(Date.now()).toISOString().substr(0,20)); //ms don't matter
  });

  test('templator can create reference links', () => {
    var sut = new Templator([{id: 'README', filename: './README.md', title: 'Readme', fullpath:'', matchData:{}}]);
    expect(sut.render("{{#notes}}[{{id}}]: {{{filename}}} ({{title}}){{/notes}}")).toBe("[README]: ./README.md (Readme)");
  });

  test('templator can create task links', () => {
    var sut = new Templator([{id: 'project', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing"]}}], [new TaskCollector]);
    expect(sut.render("{{#Tasks}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}}{{/Tasks}}")).toBe("* (A) Do the thing => [My Project][project]");
  });

  test('templator can create multiple task links', () => {
    var sut = new Templator([{id: 'project', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tasks": ["(A) Do the thing", "(B) Do the other thing"]}}], [new TaskCollector]);
    expect(sut.render("{{#Tasks}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}} \n{{/Tasks}}")).toBe("* (A) Do the thing => [My Project][project] \n* (B) Do the other thing => [My Project][project] \n");
  });

  test('templator can create multiple tag links', () => {
    var sut = new Templator([{id: 'project', filename: './project-tasks.md', title: 'My Project', fullpath:'', matchData:{"Tags": ["#atag", "#btag"]}},
        {id: 'work', filename: './work-tasks.md', title: 'My Work', fullpath:'', matchData:{"Tags": ["#atag"]}}],
        [new TagCollector]);
    expect(sut.render("{{#Tags}}\n* {{key}} : {{#value}}[{{{title}}}][{{id}}],{{/value}}\n{{/Tags}}")).toBe("* #atag : [My Project][project],[My Work][work],\n* #btag : [My Project][project],\n");
  });