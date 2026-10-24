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
      const targetId = ref.id ?? ref.filename ?? "";
      for (let j = 0; j < tags.length; j++) {
        const rawTag = tags[j];
        // Performance optimization: O(1) string slicing without string replace/regex overhead
        const start = rawTag.startsWith("[") ? 1 : 0;
        const end = rawTag.endsWith("]") ? rawTag.length - 1 : rawTag.length;
        const tag = start < end ? rawTag.substring(start, end) : (start === 0 && end === rawTag.length ? rawTag : "");
        let list = tagList.get(tag);
        if (!list) {
          list = [];
          tagList.set(tag, list);
        }
        list.push(targetId);
      }
    }
  }
  return tagList;
}

export function invertDictionary(references: formatData[]) {
  const tagList: { [tag: string]: string[]; } = Object.create(null);

  if (!references) return tagList;

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags) {
      // Performance optimization: Compute formatted link once per ref instead of per tag
      const link = formatLink(ref);
      for (let j = 0; j < tags.length; j++) {
        const tag = tags[j];
        if (!tagList[tag]) {
          tagList[tag] = [];
        }
        tagList[tag].push(link);
      }
    }
  }
  return tagList;
}

export function invertData(references: formatData[]) {
  const tagList = new Map<string, formatData[]>();

  if (!references) { return tagList; }

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags) {
      // Performance optimization: Cache formatLink and eliminate redundant Map set calls
      const link = formatLink(ref);
      for (let j = 0; j < tags.length; j++) {
        const tag = tags[j];
        let current = tagList.get(tag);
        if (!current) {
          current = [];
          tagList.set(tag, current);
        }
        current.push({ ...ref, name: tag, data: [link] });
      }
    }
  }
  return tagList;
}
