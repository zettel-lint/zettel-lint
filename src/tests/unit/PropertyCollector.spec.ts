import { expect, test } from 'vitest';
import { PropertyCollector } from '../../PropertyCollector'

test('empty file has no properties', () => {
    var sut = new PropertyCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('ignores non properties', () => {
    var sut = new PropertyCollector();
    expect(sut.collect("A paragraph of text.\n\n* A list item\n\n## A Header\n\n- [ ] A Task").toString())
      .toHaveLength(0);
  });

  test('collects properties from YAML frontmatter', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\nauthor: Charles Dickens\n---\n\n* Great Expectations"))
      .toEqual({'author': ['Charles Dickens'], 'tags': []})
  })

  test('collects properties from body', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\ntags: fiction novel classics\n---\n\n* Great Expectations [author:: Charles Dickens]"))
      .toEqual({'tags': ["fiction", "novel", "classics"], 'author': ['Charles Dickens']})
  })