import { expect, test } from 'vitest';
import { WikiCollector } from '../../collectors/WikiCollector';
import { fileWikiLinks } from '../../types';

test('backlinks come only from retained entries in map order', () => {
  const note = (id: string | undefined, links: string[]) => Object.assign(new fileWikiLinks(), {
    id, filename: `${id}.md`, matchData: { Links: links }
  });
  const result = new WikiCollector().extractAll([
    note('20200102', ['[20200101]', '[20200104]']),
    note('20200103', ['[20200101]']),
    note('20200102', ['[20200101]', '[20200101]']),
    note(undefined, ['[20200101]']),
    note('20200101', []),
    note('20200104', [])
  ]);

  expect(result.get('20200101')?.[0].bag).toEqual(['20200102', '20200102', '20200103']);
  expect(result.get('20200104')?.[0].bag).toEqual([]);
});
