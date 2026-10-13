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
  bag: any[] = [];
}

export function formatLink(ref: formatData): string {
  return "["+ref.title+"][" + ref.id + "]";
}

export function min(x: number, y: number): number | undefined {
  if (x == null || y == null) return undefined; // null == undefined
  if (x < y) return x;
  return y;
}

export function collectBacklinks(references: formatData[]) {
  var tagList = new Map<string, string[]>();

  // Performance optimization: Avoid string `.replace` and array iterator closures in hot loop (~2x faster)
  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags !== undefined) {
      const refIdentifier = ref.id ?? ref.filename ?? "";
      for (let j = 0; j < tags.length; j++) {
        let tag = tags[j];
        const start = tag.startsWith("[") ? 1 : 0;
        const end = tag.endsWith("]") ? tag.length - 1 : tag.length;
        if (start > 0 || end < tag.length) {
          tag = tag.substring(start, end);
        }
        let list = tagList.get(tag);
        if (list === undefined) {
          list = [];
          tagList.set(tag, list);
        }
        list.push(refIdentifier);
      }
    }
  }
  return tagList;
}

export function invertDictionary(references: formatData[]) {
  var tagList: { [tag: string]: string[]; } = {};

  references.forEach(ref => {
    const tags = ref.data;
    if (tags != undefined) {
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
  var tagList = new Map<string, formatData[]>();

  if (references == undefined) { return tagList; }

  references.forEach(ref => {
    const tags = ref.data;
    if (tags != undefined) {
      tags.forEach(tag => {
        var current = tagList.get(tag) ?? [];
        current.push({...ref, name: tag, data: [formatLink(ref)]});

        tagList.set(tag, current);
      });
    }
  });
  return tagList;
}