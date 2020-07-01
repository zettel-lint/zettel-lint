import { BaseImporter, ErrorResponse } from "./base-importer"
import { promise as glob } from "glob-promise";
import { promises as fs } from "fs";

class NoteInfo {
  readonly count: number = 0;
}

class TrelloCheckItemInfo {
  readonly id: String = "";
  readonly idChecklist: String = "";
  readonly name: String = "";
  readonly due: Date = new Date(Date.now());
  readonly state: String = "";
}

class TrelloChecklistInfo {
  readonly id: String = "";
  readonly idBoard: String = "";
  readonly idCard: String = "";
  readonly checkItems: TrelloCheckItemInfo[] = [];
  readonly name: String = "";
}

class TrelloCardInfo {
  readonly attachments: any[] = [];
  readonly badges: any = {};
  readonly closed: boolean = false;
  readonly cover: any = {};
  readonly customFieldItems: any[] = [];
  readonly dateLastActivity: Date = new Date(Date.now());
  readonly desc: String = "";
  readonly id: String = "";
  readonly idBoard: String = "";
  readonly idChecklists: String[] = [];
  readonly idLabels: String[] = [];
  readonly idList: String[] = [];
  readonly isTemplate: boolean = false;
  readonly name: string = "";
  readonly shortUrl: string = "";
}

class TrelloLabelInfo {
  readonly id: String = "";
  readonly name: String = "";
}

class TrelloListInfo {
  readonly id: String = "";
  readonly idBoard: String = "";
  readonly name: String = "";
  readonly closed: boolean = false;
}

class TrelloBoardInfo {
  readonly id: string = "";
  readonly name: string = "";
  readonly closed: boolean = false;
  readonly url: string = "";
  readonly prefs: any = {};
  readonly labelNames: any = {};
  readonly iimits: any = {};
  readonly actions: any[] = [];
  readonly cards: TrelloCardInfo[] = [];
  readonly checklists: any[] = [];
  readonly customFields: any[] =[];
  readonly idTags: any[] = [];
  readonly labels: TrelloLabelInfo[] = [];
  readonly lists: TrelloListInfo[] = [];
  readonly members: any[] = [];
}

export default class TrelloImport implements BaseImporter {
  async extractNotes(filename: string) : Promise<NoteInfo> {
    const contents = await fs.readFile(filename, "utf8");
    const data : TrelloBoardInfo = JSON.parse(contents);

    return {count: data.cards.length};
  }

  async importAsync(globpattern: string): Promise<ErrorResponse> {
    const files = await glob(globpattern);
    var totalNotes = 0;
    for await (const file of files) {
      const notes = await this.extractNotes(file);
      totalNotes += notes.count;
    };    
    return {success: true, message:totalNotes + " notes created"};
  }
}