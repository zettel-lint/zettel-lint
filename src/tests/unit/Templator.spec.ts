import { ContextCollector } from '../../collectors/ContextCollector';
import { TagCollector } from '../../collectors/TagCollector';
import { TaskCollector } from '../../collectors/TaskCollector';
import { Templator } from '../../Templator';
import { WikiCollector } from '../../collectors/WikiCollector';
import { describe, expect, test } from 'vitest';
import { Collector } from '../../collectors/Collector';
import { formatData } from '../../types';

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

  describe('Templator generated tests', () => {
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
      // Note 'b' has orphan links (references non-existent 'x')
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

    // Edge case tests
    test('should handle empty notes array', () => {
      const sut = new Templator([]);
      expect(sut.render("{{#notes}}{{id}}{{/notes}}")).toBe("");
    });

    test('should handle undefined notes', () => {
      const sut = new Templator(undefined);
      expect(sut.render("{{#notes}}{{id}}{{/notes}}")).toBe("");
    });

    test('should handle undefined collectors', () => {
      const notes = [{id: 'n1', wikiname: 'n1', filename: './n1.md', title: 'Note 1', fullpath: '', matchData: {}}];
      const sut = new Templator(notes, undefined);
      expect(sut.render("{{#notes}}{{id}}{{/notes}}")).toBe("n1");
    });

    test('getOrphans should return empty array when notes is undefined', () => {
      const sut = new Templator(undefined, undefined);
      expect(sut.render("{{#Orphans}}{{key}}{{/Orphans}}")).toBe("");
    });

    test('getOrphans should handle notes with no Links in matchData', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {}}
      ];
      const sut = new Templator(notes);
      expect(sut.render("{{#Orphans}}{{key}}{{/Orphans}}")).toBe("");
    });

    test('getOrphans should handle notes with empty Links array', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {'Links': [] as string[]}}
      ];
      const sut = new Templator(notes);
      expect(sut.render("{{#Orphans}}{{key}}{{/Orphans}}")).toBe("");
    });

    test('getOrphans should handle multiple orphans in single note', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {'Links': ['[x]', '[y]', '[z]'] as string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}: {{#value}}{{id}},{{/value}};{{/Orphans}}");
      expect(result).toContain("a:");
      expect(result).toContain("[x]");
      expect(result).toContain("[y]");
      expect(result).toContain("[z]");
    });

    test('getOrphans should handle mixed valid and orphaned links', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {'Links': ['[a]', '[orphan]']}}
      ];
      const sut = new Templator(notes as any);
      const result = sut.render("{{#Orphans}}{{key}}: {{#value}}{{id}},{{/value}};{{/Orphans}}");
      expect(result).toContain("b:");
      expect(result).toContain("[orphan]");
      expect(result).not.toContain("[a]");
    });

    test('getOrphans should use filename when id is undefined', () => {
      const notes = [
        {id: undefined as any, wikiname: 'x', filename: 'file.md', title: 'X', fullpath: '', matchData: {'Links': ['[orphan]'] as string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}};{{/Orphans}}");
      expect(result).toBe("file.md;");
    });

    test('getOrphans should use empty string when id and filename are undefined', () => {
      const notes = [
        {id: undefined as any, wikiname: 'x', filename: undefined as any, title: 'X', fullpath: '', matchData: {'Links': ['[orphan]'] as string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}};{{/Orphans}}");
      expect(result).toBe(";");
    });

    test('references should handle notes with Links containing brackets', () => {
      const notes = [
        {id: 'target', wikiname: 'target', filename: './target.md', title: 'Target', fullpath: '', matchData: {}},
        {id: 'source', wikiname: 'source', filename: './source.md', title: 'Source', fullpath: '', matchData: {'Links': ['[target]']}}
      ];
      const sut = new Templator(notes as any);
      const result = sut.render("{{#references}}{{id}},{{/references}}");
      expect(result).toBe("target,");
    });

    test('references should handle empty matchData', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}}
      ];
      const sut = new Templator(notes);
      expect(sut.render("{{#references}}{{id}}{{/references}}")).toBe("");
    });

    test('markdown_escape should handle text with no parentheses', () => {
      const notes = [{id: 'n1', wikiname: 'n1', filename: './n1.md', title: 'Simple Title', fullpath: '', matchData: {}}];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}{{{`title}}}{{/notes}}")).toBe("Simple Title");
    });

    test('markdown_escape should handle text with multiple parentheses', () => {
      const notes = [{id: 'n1', wikiname: 'n1', filename: './n1.md', title: '(a) (b) (c)', fullpath: '', matchData: {}}];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}{{{`title}}}{{/notes}}")).toBe("&lpar;a&rpar; &lpar;b&rpar; &lpar;c&rpar;");
    });

    test('markdown_escape should handle nested parentheses', () => {
      const notes = [{id: 'n1', wikiname: 'n1', filename: './n1.md', title: '(a(b)c)', fullpath: '', matchData: {}}];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}{{{`title}}}{{/notes}}")).toBe("&lpar;a&lpar;b&rpar;c&rpar;");
    });

    test('enhance should handle triple brace escaped syntax', () => {
      const sut = new Templator();
      const enhanced = sut.enhance("{{{`title}}}");
      expect(enhanced).toBe("{{#markdown_escape}}{{{title}}}{{/markdown_escape}}");
    });

    test('enhance should handle double brace escaped syntax', () => {
      const sut = new Templator();
      const enhanced = sut.enhance("{{`title}}");
      expect(enhanced).toBe("{{#markdown_escape}}{{title}}{{/markdown_escape}}");
    });

    test('enhance should handle multiple escape operators in one template', () => {
      const sut = new Templator();
      const enhanced = sut.enhance("{{`title}} and {{{`description}}}");
      expect(enhanced).toBe("{{#markdown_escape}}{{title}}{{/markdown_escape}} and {{#markdown_escape}}{{{description}}}{{/markdown_escape}}");
    });

    test('enhance should handle query operator with empty filter', () => {
      const sut = new Templator();
      const enhanced = sut.enhance("{{?Tags//}}content{{/?Tags}}");
      expect(enhanced).toBe("{{#query_filter}}{{`Tags//`}}content{{/query_filter}}");
    });

    test('query_filter should match all items with empty regex', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo', 'bar']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const result = sut.render("{{?Dummy//}}{{key}},{{/?Dummy}}");
      expect(result).toContain("foo,");
      expect(result).toContain("bar,");
    });

    test('query_filter with sort should handle items without the sort key', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {'Tasks': ['Task without due', 'Task due:2021-01-01'] as string[]}}
      ];
      const sut = new Templator(notes, [new TaskCollector]);
      const result = sut.render("{{?Tasks?sort(due)//}}{{key}};{{/?Tasks}}");
      // Items without 'due:' should sort to end (ZZZZZ)
      expect(result).toContain("Task due:2021-01-01");
      expect(result).toContain("Task without due");
    });

    test('query_filter should handle complex regex patterns', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo123', 'bar456', 'baz']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const result = sut.render("{{?Dummy/\\d+/}}{{key}},{{/?Dummy}}");
      expect(result).toContain("foo123,");
      expect(result).toContain("bar456,");
      expect(result).not.toContain("baz");
    });

    test('render should handle empty template', () => {
      const sut = new Templator();
      expect(sut.render("")).toBe("");
    });

    test('render should handle template with only whitespace', () => {
      const sut = new Templator();
      expect(sut.render("   \n   ")).toBe("   \n   ");
    });

    test('render should properly format dates when provided', () => {
      const sut = new Templator();
      const created = new Date("2020-06-15T10:30:00.000Z");
      const modified = new Date("2021-07-20T15:45:00.000Z");
      const result = sut.render("{{created}} | {{modified}}", created, modified);
      expect(result).toBe("2020-06-15T10:30:00.000Z | 2021-07-20T15:45:00.000Z");
    });

    test('viewProps should contain queryCount initialized to 0', () => {
      const sut = new Templator();
      expect(sut.viewProps.queryCount).toBe(0);
    });

    test('query_filter should increment queryCount for each use', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const initialCount = sut.viewProps.queryCount;
      sut.render("{{?Dummy/foo/}}{{key}}{{/?Dummy}}");
      expect(sut.viewProps.queryCount).toBeGreaterThan(initialCount);
    });

    test('should handle notes with all valid links (no orphans)', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {'Links': ['[a]']}}
      ];
      const sut = new Templator(notes as any);
      expect(sut.render("{{#Orphans}}{{key}}{{/Orphans}}")).toBe("");
    });

    test('should handle collectors extracting data from files', () => {
      const notes = [
        {id: 'n1', wikiname: 'n1', filename: './n1.md', title: 'Note 1', fullpath: '', matchData: {'Tags': ['#tag1', '#tag2'] as string[]}}
      ];
      const sut = new Templator(notes, [new TagCollector]);
      expect(sut.data.has('Tags')).toBe(true);
      const tagsMap = sut.data.get('Tags');
      expect(tagsMap?.has('#tag1')).toBe(true);
      expect(tagsMap?.has('#tag2')).toBe(true);
    });

    test('listToNamedTuple should handle empty array in value', () => {
      const sut = new Templator();
      const tuple: [string, formatData[]] = ["emptyKey", []];
      const result = sut.listToNamedTuple(tuple);
      expect(result).toEqual({key: "emptyKey", value: []});
    });

    test('should handle case insensitive function name in query_filter', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['a', 'c', 'b']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Using SORT (uppercase)
      const result = sut.render("{{?Dummy?SORT()//}}{{key}},{{/?Dummy}}");
      expect(result).toBe("a,b,c,");
    });

    test('query_filter with sort and args should parse args correctly', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {'Tasks': ['(A) Task pri:1', '(B) Task pri:2', '(C) Task'] as string[]}}
      ];
      const sut = new Templator(notes, [new TaskCollector]);
      const result = sut.render("{{?Tasks?sort(pri)//}}{{key}};{{/?Tasks}}");
      // Items with pri: should come before items without (ZZZZZ)
      const indexPri1 = result.indexOf('pri:1');
      const indexPri2 = result.indexOf('pri:2');
      const indexNoPri = result.indexOf('(C) Task');
      expect(indexPri1).toBeLessThan(indexPri2);
      expect(indexPri2).toBeLessThan(indexNoPri);
    });

    test('orphans value should contain proper formatData structure', () => {
      const notes = [
        {id: 'source', wikiname: 'source', filename: './source.md', title: 'Source', fullpath: '', matchData: {'Links': ['[missing]'] as string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{#value}}id={{id}},title={{title}},filename={{filename}};{{/value}}{{/Orphans}}");
      expect(result).toContain("id=[missing]");
      expect(result).toContain("title=[missing]");
      expect(result).toContain("filename=[missing]");
    });

    test('orphans value bag should contain reference to source note', () => {
      const notes = [
        {id: 'source', wikiname: 'source', filename: './source.md', title: 'Source', fullpath: '', matchData: {'Links': ['[missing]'] as string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{#value}}{{#bag}}{{id}},{{/bag}}{{/value}}{{/Orphans}}");
      expect(result).toContain("source,");
    });
  });
  describe('Templator regex error handling in query_filter', () => {
    test('should handle invalid regex pattern with unclosed bracket', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo', '#bar']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Invalid regex with unclosed bracket
      const template = "{{?Tags/[foo/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("error in filter:");
      expect(result).toContain("Unterminated character class");
    });

    test('should handle invalid regex pattern with unclosed parenthesis', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Invalid regex with unclosed parenthesis
      const template = "{{?Tags/(foo/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("error in filter:");
      expect(result).toContain("Unterminated group");
    });

    test('should handle invalid regex pattern with invalid escape sequence', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Invalid regex with bad escape at end
      const template = "{{?Tags/foo\\/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("error in filter:");
    });

    test('should handle invalid regex pattern with invalid quantifier', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Invalid regex with quantifier without target
      const template = "{{?Tags/*foo/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("error in filter:");
      expect(result).toContain("Nothing to repeat");
    });

    test('should handle valid complex regex pattern', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo', '#bar', '#foobar']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Valid complex regex - should match #foo and #foobar but not #bar
      const template = "{{?Tags/foo/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("* #foo");
      expect(result).toContain("* #foobar");
      expect(result).not.toContain("* #bar");
    });

    test('should handle empty filter string as valid regex', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo', '#bar']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Empty filter matches everything
      const template = "{{?Tags//}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("* #foo");
      expect(result).toContain("* #bar");
    });

    test('should handle regex with special characters properly escaped', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo.bar', '#foo-bar']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Match literal dot
      const template = "{{?Tags/\\.bar/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("* #foo.bar");
      expect(result).not.toContain("* #foo-bar");
    });

    test('should handle regex error with sorting function', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo', '#bar']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Invalid regex with sorting should still show error
      const template = "{{?Tags?sort()/[invalid/}}* {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("error in filter:");
    });

    test('should handle valid regex with sorting function', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#zebra', '#apple', '#banana']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Valid regex with sorting
      const template = "{{?Tags?sort()//}}{{key}},{{/?Tags}}";
      const result = sut.render(template);
      // Should be sorted alphabetically and all included (empty filter)
      expect(result).toBe("#apple,#banana,#zebra,");
    });
  });

  describe('Templator edge cases and boundary conditions', () => {
    test('should handle notes with no matchData', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}{{/Orphans}}");
      expect(result).toBe("");
    });

    test('should handle empty notes array', () => {
      const sut = new Templator([]);
      const result = sut.render("{{#notes}}{{id}}{{/notes}}");
      expect(result).toBe("");
    });

    test('should handle undefined notes', () => {
      const sut = new Templator(undefined);
      const result = sut.render("{{#notes}}{{id}}{{/notes}}");
      expect(result).toBe("");
    });

    test('should handle notes with undefined id', () => {
      const notes = [
        {id: undefined as any, wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#notes}}[{{id}}]{{/notes}}");
      expect(result).toBe("[]");
    });

    test('should handle orphans with no filename', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: undefined as any, title: 'A', fullpath: '', matchData: {} as {[collector: string]: string[]}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {Links: ['[missing]']} as {[collector: string]: string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}:{{#value}}{{id}},{{/value}};{{/Orphans}}");
      expect(result).toContain("b:[missing]");
    });

    test('should handle multiple orphaned links in single note', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {} as {[collector: string]: string[]}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {Links: ['[x]', '[y]', '[z]']} as {[collector: string]: string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}:{{#value}}{{id}},{{/value}};{{/Orphans}}");
      expect(result).toBe("b:[x],[y],[z],;");
    });

    test('should handle mix of existing and orphaned links', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {} as {[collector: string]: string[]}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {Links: ['[a]', '[missing]', '[a]']} as {[collector: string]: string[]}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}:{{#value}}{{id}},{{/value}};{{/Orphans}}");
      // Only [missing] should be in orphans
      expect(result).toBe("b:[missing],;");
    });

    test('should handle references when no notes link to anything', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#references}}{{id}},{{/references}}");
      expect(result).toBe("");
    });

    test('should handle note that references itself', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {Links: ['a']}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#references}}{{id}},{{/references}}");
      expect(result).toBe("a,");
    });

    test('should handle sorting with empty collection', () => {
      const sut = new Templator([], [new TagCollector]);
      const template = "{{?Tags?sort()//}}{{key}},{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toBe("");
    });

    test('should handle sorting by non-existent key', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo', '#bar']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // Sort by 'missing' key that doesn't exist - should default to 'ZZZZZ'
      const template = "{{?Tags?sort(missing)//}}{{key}},{{/?Tags}}";
      const result = sut.render(template);
      // Both should have same sort value (ZZZZZ) so original order preserved
      expect(result).toBe("#foo,#bar,");
    });

    test('should handle multiple consecutive filters', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#foo', '#bar', '#baz']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      // First filter for 'b', then another template
      const template = "{{?Tags/b/}}{{key}},{{/?Tags}}{{?Tags/foo/}}{{key}},{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toContain("#bar,#baz,");
      expect(result).toContain("#foo,");
    });

    test('should preserve created and modified dates across multiple renders', () => {
      const sut = new Templator();
      const created = new Date('2020-01-01');
      const modified = new Date('2021-01-01');
      const result1 = sut.render("{{created}}", created, modified);
      const result2 = sut.render("{{modified}}", created, modified);
      expect(result1).toBe(created.toISOString());
      expect(result2).toBe(modified.toISOString());
    });

    test('should handle template with no mustache tags', () => {
      const sut = new Templator();
      const template = "Just plain text with no tags";
      const result = sut.render(template);
      expect(result).toBe("Just plain text with no tags");
    });

    test('should handle enhance with no special operators', () => {
      const sut = new Templator();
      const template = "{{#notes}}{{title}}{{/notes}}";
      const result = sut.enhance(template);
      expect(result).toBe("{{#notes}}{{title}}{{/notes}}");
    });

    test('should handle note with empty Links array', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {Links: []}}
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}{{/Orphans}}");
      expect(result).toBe("");
    });

    test('should handle complex nested template structure', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#important']}}
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      const template = "{{?Tags/important/}}Found: {{key}}{{/?Tags}}";
      const result = sut.render(template);
      expect(result).toBe("Found: #important");
    });

    // Tests for the regex fix: [^]* -> [\s\S]*
    test('query_filter should handle multiline filter patterns', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo\nbar', 'baz']}},
        {id: 'y', wikiname: 'y', filename: './y.md', title: 'Y', fullpath: '', matchData: {Dummy: ['single']}}
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Test that multiline content in filter patterns works correctly
      const template = "{{?Dummy/foo[\\s\\S]*bar/}}* {{key}}{{/?Dummy}}";
      const result = sut.render(template);
      // Should match the multiline "foo\nbar" entry
      expect(result).toContain("* foo\nbar");
      expect(result).not.toContain("* baz");
      expect(result).not.toContain("* single");
    });

    test('query_filter should handle complex regex patterns with special characters', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {Dummy: ['test-123', 'test.456', 'test_789']}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Test pattern with hyphens and dots
      const template = "{{?Dummy/test[-.]\\d+/}}* {{key}}{{/?Dummy}}";
      const result = sut.render(template);
      expect(result).toContain("* test-123");
      expect(result).toContain("* test.456");
      expect(result).not.toContain("* test_789");
    });

    test('query_filter should handle empty filter patterns', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['foo', 'bar']}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Empty filter should match everything
      const template = "{{?Dummy//}}* {{key}}{{/?Dummy}}";
      const result = sut.render(template);
      expect(result).toContain("* foo");
      expect(result).toContain("* bar");
    });

    test('query_filter should handle filters with newlines and special chars', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['line1\nline2', 'single']}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      // Match patterns that span multiple lines
      const template = "{{?Dummy/line1[\\s\\S]*line2/}}* {{key}}{{/?Dummy}}";
      const result = sut.render(template);
      expect(result).toContain("* line1\nline2");
      expect(result).not.toContain("* single");
    });

    // Edge case tests
    test('should handle empty notes array', () => {
      const sut = new Templator([]);
      expect(sut.render("{{#notes}}{{id}}{{/notes}}")).toBe("");
    });

    test('should handle undefined notes', () => {
      const sut = new Templator(undefined);
      expect(sut.render("{{#notes}}{{id}}{{/notes}}")).toBe("");
    });

    test('should handle notes with missing optional fields', () => {
      const notes = [
        {id: 'x', wikiname: '', filename: undefined as any, title: '', fullpath: '', matchData: {}},
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#notes}}[{{id}}]{{/notes}}");
      expect(result).toBe("[x]");
    });

    test('should handle collectors with no matching data', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const result = sut.render("{{#Dummy}}{{key}}{{/Dummy}}");
      expect(result).toBe("");
    });

    test('should handle multiple different collectors', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#tag1'], Contexts: ['@work']}},
      ];
      const collector1 = new TagCollector();
      const collector2 = new ContextCollector();
      const sut = new Templator(notes, [collector1, collector2]);
      // Should handle multiple different collectors
      const resultTags = sut.render("{{#Tags}}{{key}}{{/Tags}}");
      const resultContexts = sut.render("{{#Contexts}}{{key}}{{/Contexts}}");
      expect(resultTags).toContain("#tag1");
      expect(resultContexts).toContain("@work");
    });

    test('should escape markdown special characters correctly', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'Title (with) (multiple) (parens)', fullpath: '', matchData: {}},
      ];
      const sut = new Templator(notes);
      expect(sut.render("{{#notes}}{{{`title}}}{{/notes}}")).toBe("Title &lpar;with&rpar; &lpar;multiple&rpar; &lpar;parens&rpar;");
    });

    test('should handle orphans with no links', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {}},
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}{{/Orphans}}");
      expect(result).toBe("");
    });

    test('should handle references with circular links', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {'Links': ['b']} as {[collector: string]: string[]}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {'Links': ['a']} as {[collector: string]: string[]}},
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#references}}{{id}},{{/references}}");
      // References are notes that are linked TO by other notes
      // a links to b, so b should be in references
      // b links to a, so a should be in references
      // Both are referenced, so both should appear
      expect(result).toContain("a,");
      expect(result).toContain("b,");
    });

    test('should handle sort with empty args', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['zebra', 'alpha', 'beta']}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const result = sut.render("{{?Dummy?sort()//}}* {{key}}\n{{/?Dummy}}");
      // Should sort alphabetically
      expect(result.indexOf("alpha")).toBeLessThan(result.indexOf("beta"));
      expect(result.indexOf("beta")).toBeLessThan(result.indexOf("zebra"));
    });

    test('should handle sort with non-existent key', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['item:value', 'other']}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const result = sut.render("{{?Dummy?sort(nonexistent)//}}* {{key}}\n{{/?Dummy}}");
      // Items without the key should be sorted to end (ZZZZZ)
      expect(result).toBeTruthy();
    });

    test('should handle nested template syntax', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Tags: ['#tag1']}},
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      const template = "{{#Tags}}{{key}}: {{#value}}{{id}}{{/value}}{{/Tags}}";
      const result = sut.render(template);
      expect(result).toContain("#tag1");
      expect(result).toContain("x");
    });

    test('should handle created and modified dates with specific values', () => {
      const sut = new Templator([]);
      const created = new Date('2020-01-01T00:00:00.000Z');
      const modified = new Date('2021-01-01T00:00:00.000Z');
      const result = sut.render("{{created}}|{{modified}}", created, modified);
      expect(result).toBe("2020-01-01T00:00:00.000Z|2021-01-01T00:00:00.000Z");
    });

    test('should handle undefined created and modified dates', () => {
      const sut = new Templator([]);
      const beforeTime = new Date().getTime();
      const result = sut.render("{{created}}|{{modified}}");
      const afterTime = new Date().getTime();
      // Should use current time when undefined
      expect(result).toContain("T");
      expect(result).toContain("Z");
      const parts = result.split("|");
      expect(parts.length).toBe(2);
      const createdTime = new Date(parts[0]).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(beforeTime);
      expect(createdTime).toBeLessThanOrEqual(afterTime);
    });

    test('should handle filter with regex metacharacters', () => {
      const notes = [
        {id: 'x', wikiname: 'x', filename: './x.md', title: 'X', fullpath: '', matchData: {Dummy: ['(A)', '[B]', '{C}']}},
      ];
      const collector = new DummyCollector();
      const sut = new Templator(notes, [collector]);
      const template = "{{?Dummy/\\(A\\)/}}* {{key}}{{/?Dummy}}";
      const result = sut.render(template);
      expect(result).toContain("* (A)");
      expect(result).not.toContain("* [B]");
      expect(result).not.toContain("* {C}");
    });

    test('should handle enhance with multiple operators in one template', () => {
      const sut = new Templator([]);
      const template = "{{?Tags//}} {{{`title}}} {{/?Tags}} {{?Tasks//}} {{`name}} {{/?Tasks}}";
      const enhanced = sut.enhance(template);
      // Should convert all operators
      expect(enhanced).toContain("{{#query_filter}}");
      expect(enhanced).toContain("{{#markdown_escape}}");
      // Count occurrences
      const queryCount = (enhanced.match(/{{#query_filter}}/g) || []).length;
      const escapeCount = (enhanced.match(/{{#markdown_escape}}/g) || []).length;
      expect(queryCount).toBe(2);
      expect(escapeCount).toBe(2);
    });

    test('should handle getOrphans with mixed reference patterns', () => {
      const notes = [
        {id: 'real', wikiname: 'real', filename: './real.md', title: 'Real', fullpath: '', matchData: {} as {[collector: string]: string[]}},
        {id: 'linker', wikiname: 'linker', filename: './linker.md', title: 'Linker', fullpath: '', matchData: {'Links': ['[real]', '[missing]', '[another-missing]']} as {[collector: string]: string[]}},
      ];
      const sut = new Templator(notes);
      const result = sut.render("{{#Orphans}}{{key}}: {{#value}}{{id}},{{/value}};{{/Orphans}}");
      // Should list orphaned references
      expect(result).toContain("linker:");
      expect(result).toContain("[missing]");
      expect(result).toContain("[another-missing]");
      expect(result).not.toContain("[real]");
    });

    test('should handle listToNamedTuple with empty array', () => {
      const sut = new Templator();
      const tuple = ["key", []];
      expect(sut.listToNamedTuple(tuple as any)).toEqual({key: "key", value: []});
    });

    test('should handle collector data extraction with duplicate entries', () => {
      const notes = [
        {id: 'a', wikiname: 'a', filename: './a.md', title: 'A', fullpath: '', matchData: {Tags: ['#duplicate', '#unique']}},
        {id: 'b', wikiname: 'b', filename: './b.md', title: 'B', fullpath: '', matchData: {Tags: ['#duplicate']}},
      ];
      const collector = new TagCollector();
      const sut = new Templator(notes, [collector]);
      const result = sut.render("{{#Tags}}{{key}}: {{#value}}{{id}},{{/value}}\n{{/Tags}}");
      // #duplicate should list both files
      expect(result).toContain("#duplicate: a,b,");
      expect(result).toContain("#unique: a,");
    });
  });
