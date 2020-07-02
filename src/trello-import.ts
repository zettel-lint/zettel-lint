import { BaseImporter, ErrorResponse } from "./base-importer"
import { promise as glob } from "glob-promise";
import { promises as fs } from "fs";

class NoteInfo {
  readonly count: number = 0;
}

class TrelloCheckItemInfo {
  readonly id: string = "";
  readonly idChecklist: string = "";
  readonly name: string = "";
  readonly due: Date = new Date(Date.now());
  readonly state: string = "";
}

class TrelloChecklistInfo {
  readonly id: string = "";
  readonly idBoard: string = "";
  readonly idCard: string = "";
  readonly checkItems: TrelloCheckItemInfo[] = [];
  readonly name: string = "";
}

class TrelloCardInfo {
  readonly attachments: any[] = [];
  readonly badges: any = {};
  readonly closed: boolean = false;
  readonly cover: any = {};
  readonly customFieldItems: any[] = [];
  readonly dateLastActivity: Date = new Date(Date.now());
  readonly desc: string = "";
  readonly id: string = "";
  readonly idBoard: string = "";
  readonly idChecklists: string[] = [];
  readonly idLabels: string[] = [];
  readonly idList: string[] = [];
  readonly isTemplate: boolean = false;
  readonly name: string = "";
  readonly shortUrl: string = "";
}

class TrelloLabelInfo {
  readonly id: string = "";
  readonly name: string = "";
}

class TrelloListInfo {
  readonly id: string = "";
  readonly idBoard: string = "";
  readonly name: string = "";
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
  readonly checklists: TrelloChecklistInfo[] = [];
  readonly customFields: any[] =[];
  readonly idTags: any[] = [];
  readonly labels: TrelloLabelInfo[] = [];
  readonly lists: TrelloListInfo[] = [];
  readonly members: any[] = [];
}

export default class TrelloImport implements BaseImporter {
  async extractNotes(filename: string) : Promise<TrelloBoardInfo> {
    const contents = await fs.readFile(filename, "utf8");
    const data : TrelloBoardInfo = JSON.parse(contents);

    return data;
  }

  writeCheckList(cl: TrelloChecklistInfo) {
    return "### " + cl.name + "\n\n" +
      cl.checkItems.map(ci => "* [" + (ci.state === "complete" ? "X" : " ") + "] " + ci.name + (ci.due ? " due:" + ci.due.toISOString() : "")).join("\n");
  }

  async writeCard(card: TrelloCardInfo,
      checklists : { [id: string]: TrelloChecklistInfo; }) {
    const outputFilename :string = "../trello/" + card.id + "-" + this.sanitiseName(card) + ".md";
    const header = "---" +
      "\ncreated: " + card.dateLastActivity +
      "\nmodified: " + card.dateLastActivity +
      "\ntitle: " + card.name +
      "\ntags: #blogs #trello " +
      "\nreferences:" +
      (card.closed ? "\n closed: true": "") +
      "\n---" +
      "\n\n# " + card.name +
      "\n\n";
    
    try {
      await fs.writeFile(outputFilename, 
        header + 
        card.desc + 
        "\n\n## Checklists\n\n" + 
        card.idChecklists.map(checklistId => this.writeCheckList(checklists[checklistId])).join("\n\n")
        , { });        
    } catch (error) {
      console.error("Could not write file " + outputFilename + " because " + error);
    }
  }

  private sanitiseName(card: TrelloCardInfo) {
    return card.name.replace(/[^A-Za-z0-9]/gm, '-');
  }

  async importAsync(globpattern: string): Promise<ErrorResponse> {
    const files = await glob(globpattern);
    var totalNotes = 0;
    var checklists : { [id: string]: TrelloChecklistInfo; } = {};
    for await (const file of files) {
      const notes = await this.extractNotes(file);
      totalNotes += notes.cards.length;
      notes.checklists.forEach(checklist => {
        checklists[checklist.id] = checklist;
      });
      for await(const note of notes.cards) {
        this.writeCard(note, checklists);
      }
    };    
    return {success: true, message:totalNotes + " notes created"};
  }
}