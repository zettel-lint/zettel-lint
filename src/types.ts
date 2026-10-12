
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

export function formatLink(ref: formatData): string {
  return `[${ref.title}][${ref.id}]`;
}

export function min(x: number, y: number): number | undefined {
  if (x == null || y == null) return undefined; // null == undefined
  if (x < y) return x;
  return y;
}

export function collectBacklinks(references: formatData[]) {
  // Performance optimization: use fast string slicing instead of replace()
  // and reuse Map.get reference to eliminate repeated Map lookups.
  const tagList = new Map<string, string[]>();

  if (!references) return tagList;

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags) {
      for (let j = 0; j < tags.length; j++) {
        let tag = tags[j];
        if (tag.startsWith("[")) tag = tag.slice(1);
        if (tag.endsWith("]")) tag = tag.slice(0, -1);

        let list = tagList.get(tag);
        if (!list) {
          list = [];
          tagList.set(tag, list);
        }
        list.push(ref.id ?? ref.filename ?? "");
      }
    }
  }
  return tagList;
}

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
