
export class fileWikiLinks {
  id: string | undefined;
  title: string | undefined;
  filename: string | undefined;
  wikiname: string | undefined;
  fullpath: string | undefined;
  matchData: { [collector: string]: string[]; } = {};
}

export class formatData {
  id: string | undefined;
  title: string | undefined;
  filename: string | undefined;
  fullpath: string | undefined;
  name: string | undefined;
  data: string[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: bag contains arbitrary note objects
  bag: any[] = [];
}

/**
 * Formats a Markdown reference link as `[title][id]` without escaping either value.
 * Undefined titles or IDs appear as the literal text `undefined`.
 */
export function formatLink(ref: formatData): string {
  return `[${ref.title}][${ref.id}]`;
}

export function min(x: number, y: number): number | undefined {
  if (x == null || y == null) return undefined; // null == undefined
  if (x < y) return x;
  return y;
}

/**
 * Groups source references by the links in their data, removing at most one leading
 * `[` and one trailing `]` from each key and preserving interior brackets.
 * Source IDs fall back to filenames, then an empty string, for null or undefined values.
 * Order and duplicates are preserved within each group. Null or undefined references
 * produce an empty map; references with null or undefined data are skipped.
 */
export function collectBacklinks(references: formatData[]) {
  // Keep boundary slicing and reference ID resolution out of the inner loop.
  const tagList = new Map<string, string[]>();

  if (!references) return tagList;

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags) {
      const refIdentifier = ref.id ?? ref.filename ?? "";
      for (let j = 0; j < tags.length; j++) {
        let tag = tags[j];
        const start = tag.startsWith("[") ? 1 : 0;
        const end = tag.endsWith("]") ? tag.length - 1 : tag.length;
        if (start > 0 || end < tag.length) {
          tag = tag.substring(start, end);
        }

        let list = tagList.get(tag);
        if (!list) {
          list = [];
          tagList.set(tag, list);
        }
        list.push(refIdentifier);
      }
    }
  }
  return tagList;
}

/**
 * Groups references by their exact data values, with `[title][id]` links as values.
 * Preserves order and duplicates within each group and skips undefined data.
 *
 * @throws TypeError if data is null or a tag collides with an inherited object property.
 */
export function invertDictionary(references: formatData[]) {
  var tagList: { [tag: string]: string[]; } = {};

  references.forEach(ref => {
    const tags = ref.data;
    if (tags !== undefined) {
      tags.forEach(tag => {
        if (tagList[tag] === undefined) {
          tagList[tag] = [];
        }
        tagList[tag].push(formatLink(ref));
      });
    }
  });
  return tagList;
}

/**
 * Groups references by their exact data values, preserving order and duplicates.
 * Each entry is a shallow copy with name set to the grouping value and data replaced
 * by a single `[title][id]` link; nested values such as bag remain shared.
 * Null or undefined references produce an empty map; null or undefined data is skipped.
 */
export function invertData(references: formatData[]) {
  // Performance optimization: eliminate redundant Map.set calls for existing entries
  const tagList = new Map<string, formatData[]>();

  if (!references) { return tagList; }

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags) {
      for (let j = 0; j < tags.length; j++) {
        const tag = tags[j];
        let current = tagList.get(tag);
        if (!current) {
          current = [];
          tagList.set(tag, current);
        }
        current.push({...ref, name: tag, data: [formatLink(ref)]});
      }
    }
  }
  return tagList;
}
