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
  const tagList = new Map<string, string[]>();

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const tags = ref.data;
    if (tags) {
      const targetId = ref.id ?? ref.filename ?? "";
      for (let j = 0; j < tags.length; j++) {
        let tag = tags[j];
        // Performance optimization: Fast string slicing over multiple replace calls
        if (tag.startsWith("[") && tag.endsWith("]")) {
          tag = tag.slice(1, -1);
        } else {
          tag = tag.replace("[", "").replace("]", "");
        }
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
  const tagList: { [tag: string]: string[]; } = {};

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
