import { expect, test } from 'vitest';
import { OrphanCollector } from '../../OrphanCollector';
import { fileWikiLinks } from '../../types';

test('empty file has no orphans', () => {
  const sut = new OrphanCollector();
  expect(sut.collect("")).toHaveLength(0);
});

test('detects orphaned wiki links', () => {
  const sut = new OrphanCollector();
  const files: fileWikiLinks[] = [
    {
      id: "test",
      filename: "test.md",
      fullpath: "test.md",
      wikiname: "test",
      title: "Test",
      matchData: {
        WikiCollector: ["[nonexistent][]"]
      }
    }
  ];
  
  const result = sut.extractAll(files);
  expect(result.get("test.md")?.[0].data).toContain("[nonexistent]");
});

test('ignores valid references', () => {
  const sut = new OrphanCollector();
  const files: fileWikiLinks[] = [
    {
      id: "existing",
      filename: "existing.md", 
      fullpath: "existing.md",
      wikiname: "existing",
      title: "Existing",
      matchData: {}
    },
    {
      id: "test",
      filename: "test.md",
      fullpath: "test.md", 
      wikiname: "test",
      title: "Test",
      matchData: {
        WikiCollector: ["[existing][]"]
      }
    }
  ];

  const result = sut.extractAll(files);
  expect(result.size).toBe(0);
});
