import { expect, test } from 'vitest';
import { OrphanCollector } from '../../OrphanCollector';

test('empty file has no orphans', () => {
  const sut = new OrphanCollector();
  expect(sut.collect("")).toHaveLength(0);
});

test('ignores double-bracket wiki links', () => {
  const sut = new OrphanCollector();
  // Double-bracket links don't match orphan pattern (no empty target indicators)
  expect(sut.collect("[[ExistingPage]]")).toHaveLength(0);
});

test('detects orphaned wiki links', () => {
  const sut = new OrphanCollector();
  // Simulate a link that would be orphaned (no file exists for it)
  expect(sut.collect("[OrphanPage][]")).toContain("[OrphanPage]");
});

test('ignores markdown links', () => {
  const sut = new OrphanCollector();
  expect(sut.collect("[real-file](a.real.file.md)")).toHaveLength(0);
});

test('detects empty markdown links', () => {
  const sut = new OrphanCollector();
  expect(sut.collect("[real-file]()")).toContain("[real-file]");
});

test('ignores reference links', () => {
  const sut = new OrphanCollector();
  expect(sut.collect("[title-text][see-reference-below]")).toHaveLength(0);
});

test('ignores trailing characters', () => {
  const sut = new OrphanCollector();
  expect(sut.collect("[title-text][]]\"")).toContain("[title-text]");
});
