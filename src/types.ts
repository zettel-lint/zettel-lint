
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