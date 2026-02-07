import { BaseImporter, ErrorResponse } from "./base-importer.js"
import { glob } from "glob";
import { promises as fs } from "fs";
import axios from "axios";
import { min } from "./types.js";

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

class AttachmentInfo {
  readonly bytes: any = {};
  readonly date: Date = new Date(Date.now());
  readonly edgeColor: string = "#000000";
  readonly idMember: string = "";
  readonly isUpload: boolean = false;
  readonly mimeType: string = "";
  readonly name: string = "";
  readonly previews: any[] = [];
  readonly url: string = "";
  readonly pos: number = 0;
  readonly fileName: string = "";
  readonly id: string = "";
}

class TrelloCardInfo {
  readonly attachments: AttachmentInfo[] = [];
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
  readonly labels: TrelloLabelInfo[] = [];
  readonly idList: string = "";
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
  readonly limits: any = {};
  readonly actions: any[] = [];
  readonly cards: TrelloCardInfo[] = [];
  readonly checklists: TrelloChecklistInfo[] = [];
  readonly customFields: any[] =[];
  readonly idTags: any[] = [];
  readonly labels: TrelloLabelInfo[] = [];
  readonly lists: TrelloListInfo[] = [];
  readonly members: any[] = [];
}

function sortableDate(d: Date) : string {
  // Because String.ToDate("YYYYMMDDHHmmSS") is too processed for an artisan language like JS?
  // And no, moment.js is not a good solution - we don't need a new library to do one bit of formatting

  // WTF - card.dateLastActivity is a Date without any date methods.

  return ("" + d).replace(/[^0-9]/g,"").substring(0,14);
}

export default class TrelloImport implements BaseImporter {
  static async downloadBoardJson(options: {
    boardIdOrName: string,
    apiKey: string,
    token?: string,
    verbose?: boolean
  }): Promise<any> {
    let { boardIdOrName, apiKey, token, verbose } = options;
    // If not a Trello board id (alphanumeric, 8 or 24 chars), look up by name
    if (!/^([0-9a-f]{8}|[0-9a-f]{24})$/i.test(boardIdOrName)) {
      if (verbose) {
        console.log(`Looking up Trello board id for name: ${boardIdOrName}`);
      }
      if (!token) {
        throw new Error("A Trello token (--trello-token) is required to look up boards by name.");
      }
      const boardsUrl = `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${token}`;
      const boardsRes = await axios.get(boardsUrl);
      const boards = boardsRes.data;
      const found = boards.find((b: any) => b.name === boardIdOrName);
      if (!found) {
        throw new Error(`Could not find Trello board with name: ${boardIdOrName}`);
      }
      boardIdOrName = found.id;
      if (verbose) {
        console.log(`Resolved board name '${options.boardIdOrName}' to id: ${boardIdOrName}`);
      }
    }
    const url = `https://api.trello.com/1/boards/${boardIdOrName}?key=${apiKey}&cards=all&lists=all&checklists=all&labels=all&members=all&fields=all` + (token ? `&token=${token}` : '');
    if (verbose) {
      console.log(`Downloading Trello board ${boardIdOrName}`);
    }
    const res = await axios.get(url);
    return res.data;
  }
  async extractNotes(filename: string) : Promise<TrelloBoardInfo> {
    const contents = await fs.readFile(filename, "utf8");
    const data : TrelloBoardInfo = JSON.parse(contents);

    return data;
  }

  writeCheckList(cl: TrelloChecklistInfo) {
    return "### " + cl.name + "\n\n" +
      cl.checkItems.map(ci => "* [" + (ci.state === "complete" ? "X" : " ") + "] " + ci.name + (ci.due ? " due:" + ci.due.toISOString() : "")).join("\n");
  }

  async saveAttachments(outputFolder: string, attachments: AttachmentInfo[]) : Promise<string[]> {
    var filenames: string[] = [];

    for await (var attachment of attachments) {
      const outputFilename = outputFolder + attachment.fileName;  
      // TODO : Add Verbose clause here
      // console.log("Writing attachment " + attachment.id + " from " + attachment.url + " to " + outputFilename + " of type " + attachment.mimeType);
      if (attachment.fileName == null || attachment.fileName === "null" || attachment.fileName === "") {
        // It's a URL
        filenames.push("[" + attachment.name + "](" + attachment.url + ")");
        continue;
      }      
      try {
        const response = await axios.get(attachment.url, { responseType: "arraybuffer"});
        const data = await response.data;
        await fs.writeFile(outputFilename, data);
        filenames.push("![" + attachment.name + "](" + outputFilename + ")");
      } catch (error) {
        console.error("Could not write file " + outputFilename + " because " + error);
      }
    }
    return filenames;
  }

  async writeCard(outputFolder: string,
      boardName: string,
      card: TrelloCardInfo,
      checklists : { [id: string]: TrelloChecklistInfo; },
      lists : { [id: string]: TrelloListInfo; }) : Promise<boolean> {
    const outputFilename :string = outputFolder + 
      sortableDate(card.dateLastActivity) + 
      "-" + this.sanitiseName(card) + ".md";

    const filenames = await this.saveAttachments(outputFolder + "attachments/", card.attachments || []);

    const header = "---" +
      "\ncreated: " + card.dateLastActivity +
      "\nmodified: " + card.dateLastActivity +
      "\ntitle: '" + card.name + "'" +
      "\nsource: Trello" + 
      "\ntags:" + card.labels.map(l => l.name.replace(/[^a-zA-Z0-9]/g, "_")).join(" #") +
      "\nreferences: " +
      (card.closed ? "\n closed: true": "") +
      (card.isTemplate ? "\n template: true": "") +
      "\nboard: '" + boardName + "'" + 
      "\nlist: '" + lists[card.idList].name + "'" +
      "\npublished: " + lists[card.idList].name.includes("Published") +
      "\ntrello-url: '" + card.shortUrl + "'" +
      "\n---" +
      "\n\n## " + card.name +
      "\n\n";
    
    try {
      await fs.writeFile(outputFilename, 
        header + 
        card.desc + 
        "\n\n---\n\n## Checklists\n\n" + 
        card.idChecklists.map(checklistId => this.writeCheckList(checklists[checklistId])).join("\n\n") +
        (filenames.length > 0 ? "\n\n---\n\n## Attachments\n\n* " + filenames.join("\n* ") : "")
        , { });
        return true;     
    } catch (error) {
      console.error("Could not write file " + outputFilename + " because " + error);
    }
    return false;
  }

  private sanitiseName(card: TrelloCardInfo) {
    return card.name.replace(/[^A-Za-z0-9]/gm, '-').slice(0, min(50, card.name.length));
  }

  async importAsync(globpattern: string, outputFolder: string): Promise<ErrorResponse> {
    // Ensure output folder exists and has a path separator at the end
    if (!outputFolder.endsWith("/")) {
      outputFolder += "/";
    }
    const files = await glob(globpattern);
    var totalCards = 0;
    var totalNotes = 0;
    var checklists : { [id: string]: TrelloChecklistInfo; } = {};
    var lists : { [id: string]: TrelloListInfo; } = {};
    var labels : { [id: string]: TrelloLabelInfo; } = {};
    if (files.length === 0) {
      return { success: false, message: "No files found matching " + globpattern };
    } else  {
      console.warn(`${files.length} files found matching ${globpattern}, importing all of them.`);
    }
    for await (const file of files) {
      const notes = await this.extractNotes(file);
      totalCards += notes.cards.length;
      notes.checklists.forEach(checklist => {
        checklists[checklist.id] = checklist;
      });
      notes.lists.forEach(list => {
        lists[list.id] = list;
      });
      notes.labels.forEach(label => {
        labels[label.id] = label;
      })
      for await(const note of notes.cards) {
        if(!note.closed && !note.isTemplate && !lists[note.idList].closed && await this.writeCard(outputFolder, notes.name, note, checklists, lists)) {
          totalNotes++;
        }
      }
    };    
    return {success: true, message:totalCards + " cards found; " + totalNotes + " notes created."};
  }
}