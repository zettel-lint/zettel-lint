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
    var sut = new Templator([{id: 'README', filename: './README.md', title: 'Readme', fullpath:'', data:[]}], []);
    expect(sut.render("{{#notes}}[{{id}}]: {{{filename}}} ({{title}}){{/notes}}")).toBe("[README]: ./README.md (Readme)");
  });