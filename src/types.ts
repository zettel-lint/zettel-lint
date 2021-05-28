
export class fileWikiLinks {
  id: string | undefined;
  title: string | undefined;
  filename: string | undefined;
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

  references.forEach(ref => {
    const tags = ref.data;
    if (tags != undefined) {
      tags.forEach(tag => {
        tag = tag.replace("[", "").replace("]", "")
        if (tagList.get(tag) === undefined) {
          tagList.set(tag, []);
        }
        tagList.get(tag)?.push(ref.id ?? ref.filename ?? "");
      });
    }
  });
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