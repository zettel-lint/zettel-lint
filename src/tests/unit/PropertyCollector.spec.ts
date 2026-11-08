import { expect, test } from 'vitest';
import { PropertyCollector } from '../../collectors/PropertyCollector'
import { formatData } from '../../types.js';

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
      .toEqual({ hasInline: false, properties: { 'author': ['Charles Dickens'] } });
  })

  test('collects properties from YAML frontmatter using indented list format', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\nauthor:\n  - Charles Dickens\n---\n\n* Great Expectations"))
      .toEqual({ hasInline: false, properties: { 'author': ['Charles Dickens'] } });
  })

  test('collects properties from YAML frontmatter using array format', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\nauthor: ['Charles Dickens', ]\n---\n\n* Great Expectations"))
      .toEqual({ hasInline: false, properties: { 'author': ['Charles Dickens'] } });
  })

  test('collects properties from body', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\ntags: fiction novel classics\n---\n\n* Great Expectations [author:: Charles Dickens]"))
      .toEqual({ hasInline: true, properties: { 'tags': ["fiction", "novel", "classics"], 'author': ['Charles Dickens'] } });
  })

  test('merges unique properties', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\ntags: fiction novel\n---\n\n* Great Expectations [author:: Charles Dickens] [tags:: novel, classics]"))
      .toEqual({ hasInline: true, properties: { 'tags': ["fiction", "novel", "classics"], 'author': ['Charles Dickens'] } });
  })

  test('ignores properties that do not match a regex pattern', () => {
    var sut = new PropertyCollector();
    expect(sut.collectProperties("---\ntags: fiction novel\n---\n\n* Great Expectations [author:: Charles Dickens] [tags:: novel, classics]", [/^tags$/]))
      .toEqual({ hasInline: true, properties: { 'tags': ["fiction", "novel", "classics"] } });
  })


  test('writes out to header', () => {
    var sut = new PropertyCollector();
    expect(
      sut.writeHeader(
        sut.collectProperties("---\ntags: fiction novel\n---\n\n* Great Expectations [author:: Charles Dickens] [tags:: novel, classics]").properties)
      )
      .toEqual("---\ntags:\n  - fiction\n  - novel\n  - classics\nauthor:\n  - Charles Dickens\n---\n")
  })

  test('returns false if no inline properties', () => {
    const sut = new PropertyCollector();
    expect(
      sut.collectProperties("---\nauthor: Charles Dickens\n---\n\n* Great Expectations").hasInline
    ).toBe(false);
  });

  test('regex does not filter YAML keys', () => {
  const sut = new PropertyCollector();
  expect(
    sut.collectProperties("---\nauthor: Charles Dickens\n---\n\n[tags:: classic]", [/^tags$/])
  ).toEqual({ hasInline: true, properties: { author: ['Charles Dickens'], tags: ['classic'] } });
});

test('filters correctly when regex has global flag', () => {
  const sut = new PropertyCollector();
  expect(
    sut.collectProperties("---\n---\n\n[tag:: v] [tag-extra:: v2]", [/^tag$/g])
  ).toEqual({ hasInline: true, properties: { tag: ['v'] } });
});

test('handles built-in object properties safely without throwing or prototype collision', () => {
  const sut = new PropertyCollector();
  const res = sut.collectProperties("[toString:: test] [valueOf:: val]");
  expect(res.hasInline).toBe(true);
  expect(res.properties.toString).toEqual(['test']);
  expect(res.properties.valueOf).toEqual(['val']);
});

test('ignores dangerous keys (__proto__, constructor, prototype) to prevent prototype pollution', () => {
  const sut = new PropertyCollector();
  const res = sut.collectProperties("---\n__proto__:\n  polluted: true\nconstructor: bad\n---\n\n[__proto__:: bad] [constructor:: bad] [prototype:: bad]");
  expect(res.properties['__proto__']).toBeUndefined();
  expect(res.properties.constructor).toBeUndefined();
  expect(res.properties.prototype).toBeUndefined();
  expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
});

test('formats references sorted alphabetically by property key', () => {
  const sut = new PropertyCollector();
  const ref1 = new formatData();
  ref1.id = 'doc1';
  ref1.title = 'Document 1';
  ref1.data = ['category', 'author'];

  const ref2 = new formatData();
  ref2.id = 'doc2';
  ref2.title = 'Document 2';
  ref2.data = ['author'];

  // format is protected, access via index signature
  const formatted = (sut as unknown as { format: (refs: formatData[]) => string }).format([ref1, ref2]);
  expect(formatted).toBe('* author : [Document 1][doc1],[Document 2][doc2]\n* category : [Document 1][doc1]\n');
});
