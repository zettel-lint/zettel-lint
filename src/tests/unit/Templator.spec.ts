import { ContextCollector } from '../../ContextCollector';
import { TagCollector } from '../../TagCollector';
import { TaskCollector } from '../../TaskCollector';
import { Templator } from '../../Templator';
import { WikiCollector } from '../../WikiCollector';
import { describe, expect, test } from 'vitest';
import { Collector } from '../../Collector';

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
  * {{#data}}{{.}}{{^last}}, {{/last}}{{/data}}{{^data}}No links{{/data}}
  * {{#bag}}[{{.}}]{{^last}}, {{/last}}{{/bag}}{{^bag}}No backlinks{{/bag}}
{{/value}}{{/Links}}

</details>

## Orphans

<details>
<summary>Show Orphans</summary>

{{#Orphans}}
* [{{key}}] : {{#value}}{{id}}{{^last}}, {{/last}}{{/value}}
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
  * [Not a link], [Orphaned link], 
  * [project], 

</details>

## Orphans

<details>
<summary>Show Orphans</summary>

* [work] : [Not a link], [Orphaned link], 

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
    const beforeTime = new Date();
    const result = sut.render("{{modified}}");
    const afterTime = new Date();
    
    // Convert result string to date for comparison
    const resultDate = new Date(result);
    
    // Check that the result time is between beforeTime and afterTime
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(resultDate.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  test('templator can create reference links', () => {
    var sut = new Templator([{id: 'README', wikiname: 'README', filename: './README.md', title: 'Readme', fullpath:'', matchData:{}}]);
    expect(sut.render("{{#notes}}[{{id}}]: {{{filename}}} ({{title}}){{/notes}}", new Date("2021-01-01"), new Date("2021-01-01"))).toBe("[README]: ./README.md (Readme)");
  });

  test('templator can create filter reference links to only those that are used', () => {
    var sut = new Templator([{id: 'README', wikiname: 'README', filename: './README.md', title: 'Readme', fullpath:'', matchData:{}},{id: 'linkToREADME', wikiname: 'linkToREADME', filename: './LinkToREADME.md', title: 'Link to Readme', fullpath:'', matchData:{'Links': ['README']}}]);
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
    expect(sut.render("{{?Tasks/\(A\)/}}* {{{key}}} => {{#value}}[{{{title}}}][{{id}}]{{/value}} \n{{/?Tasks}}")).toBe("* (A) Do the thing => [My Project][project] \n");
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
            "Links": ["[Not a link]", "[Orphaned link]"],
            "Tasks": ["(A) My important task"]}}],
        [new TagCollector, new TaskCollector, new WikiCollector, new ContextCollector]);
    expect(sut.render(full_template, new Date("2021-01-01"), new Date("2021-01-01"))).toBe(full_expected);
  });
  // Dummy Collector for testing
  class DummyCollector extends Collector {
    dataName = 'Dummy';
    extractAll(files: any[]) {
      const map = new Map();
      files.forEach(f => {
        (f.matchData?.Dummy || []).forEach((d: string) => {
          if (!map.has(d)) map.set(d, []);
          map.get(d).push(f);
        });
      });
      return map;
    }
    collect(content: string): string[] {
      // Dummy implementation, just return an empty array
      return [];
    }
    format(references: any[]): string {
      return "Dummy";
    }
  }

  describe('Templator generated tests', () => {
    test('should render created and modified dates', () => {
      const sut = new Templator();
      const now = new Date();
      const rendered = sut.render("{{created}} {{modified}}", now, now);
      expect(rendered).toContain(now.toISOString());
    });

    test('should render notes as reference links', () => {
      const notes = [{id: 'n1', wikiname: 'n1', filename: './n1.md', title: 'Note 1', fullpath: '', matchData: {}}];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}[{{id}}]: {{{filename}}} ({{title}}){{/notes}}")).toBe("[n1]: ./n1.md (Note 1)");
    });

    test('should render wiki links', () => {
      const notes = [{id: 'n2', wikiname: 'n2', filename: './n2.md', title: 'Note 2', fullpath: '', matchData: {}}];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}[[{{wikiname}}]]{{/notes}}")).toBe("[[n2]]");
    });

    test('should escape markdown in title', () => {
      const notes = [{id: 'n3', wikiname: 'n3', filename: './n3.md', title: 'Title (with) parens', fullpath: '', matchData: {}}];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}{{{`title}}}{{/notes}}")).toBe("Title &lpar;with&rpar; parens");
    });

    test('should filter orphans correctly', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {'Links': ['x']} as {[collector: string]: string[]}},
        {id: 'c', wikiname: 'c', filename: './c.md', title: 'C', fullpath: '', matchData: {}}
      ];
      const sut = new Templator(notes);
      // Only 'c' is orphan (not referenced and doesn't reference others)
      const result = sut.render("{{#Orphans}}{{key}}: {{#value}}{{id}}, {{/value}}{{/Orphans}}");
      expect(result).toContain("b: x");
      expect(result).not.toContain("a:");
      expect(result).not.toContain("c:");
    });

    test('should render references (notes that are referenced)', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {'Links': ['a']} as {[collector: string]: string[]}},
      ];
      const sut = new Templator(notes);
      // Only 'a' is referenced
      expect(sut.render("{{#references}}{{id}},{{/references}}")).toBe("a,");
    });

    test('should support custom collectors and expose their data', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo', 'bar']}},
        {id: 'y', wikiname: 'y', filename: './y.md', title: 'Y', fullpath: '', matchData: {Dummy: ['foo']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Should expose Dummy as a list of {key, value}
      const result = sut.render("{{#Dummy}}{{key}}:{{#value}}{{id}},{{/value}};{{/Dummy}}");
      // foo: x, y; bar: x;
      expect(result).toContain("foo:x,y,");
      expect(result).toContain("bar:x,");
    });

    test('enhance should convert escape and query operators', () => {
      const sut = new Templator();
      const enhanced = sut.enhance("{{?Dummy//foo//}} and {{{`title}}}");
      expect(enhanced).toContain("{{#query_filter}}{{`Dummy//foo//`}}");
      expect(enhanced).toContain("{{#markdown_escape}}{{{title}}}{{/markdown_escape}}");
    });

    test('should support query_filter for filtering', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo', 'bar']}},
        {id: 'y', wikiname: 'y', filename: './y.md', title: 'Y', fullpath: '', matchData: {Dummy: ['foo']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Only foo key should match
      const template = "{{?Dummy/foo/}}* {{key}}:{{#value}}{{id}},{{/value}}{{/?Dummy}}";
      const result = sut.render(template);
      expect(result).toContain("* foo:x,y,");
      expect(result).not.toContain("bar");
    });

    test('should support query_filter with unknown function', () => {
      const sut = new Templator();
      const template = "{{?Dummy?unknown()/foo/}}{{/?Dummy}}";
      const enhanced = sut.enhance(template);
      expect(enhanced).toContain("{{#query_filter}}{{`Dummy?unknown()/foo/`}}");
      expect(enhanced).toContain("{{/query_filter}}");
      const result = sut.render(template);
      expect(result).toContain("unknown function");
    });

    test('listToNamedTuple returns correct object', () => {
      const sut = new Templator();
      const tuple = ["key", [{id: "id", wikiname: "w", filename: "f", title: "t", fullpath: "", matchData: {}}]];
      expect(sut.listToNamedTuple(tuple as any)).toEqual({key: "key", value: tuple[1]});
    });
  });

