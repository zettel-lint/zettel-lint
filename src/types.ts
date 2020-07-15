
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
  data: string[] = [];
}

export function formatLink(ref: formatData): string {
  return "["+ref.title+"][" + ref.id + "]";
}

export function min(x: number, y: number): number | undefined {
  if (x == null || y == null) return undefined; // null == undefined
  if (x < y) return x;
  return y;
}

export function invertDictionary(references: formatData[]) {
  var tagList: { [tag: string]: string[]; } = {};

  references.forEach(ref => {
    const tags = ref.data;
    tags.forEach(tag => {
      if (tagList[tag] === undefined) {
        tagList[tag] = [];
      }
      tagList[tag].push(formatLink(ref));
    });
  });
  return tagList;
}