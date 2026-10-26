import { BaseImporter, ErrorResponse, ImportOptions } from "./base-importer.js"
import { glob } from "glob";
import { promises as fs } from "fs";
import path from "node:path";
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

class TrelloMemberCreator {
  readonly id: string = "";
  readonly username?: string = "";
  readonly fullName?: string = "";
}

class TrelloActionData {
  readonly text?: string = "";
  readonly card?: { id: string } = { id: "" };
}

class TrelloActionInfo {
  readonly id: string = "";
  readonly idMemberCreator?: string = "";
  readonly data?: TrelloActionData = {};
  readonly type: string = "";
  readonly date: Date | string = new Date(Date.now());
  readonly memberCreator?: TrelloMemberCreator = new TrelloMemberCreator();
}

export class TrelloCommentInfo {
  readonly text: string = "";
  readonly date: Date = new Date(Date.now());
  readonly authorName: string = "";

  constructor(text: string = "", date: Date = new Date(Date.now()), authorName: string = "") {
    this.text = text;
    this.date = date;
    this.authorName = authorName;
  }
}

class TrelloBoardInfo {
  readonly id: string = "";
  readonly name: string = "";
  readonly closed: boolean = false;
  readonly url: string = "";
  readonly prefs: any = {};
  readonly labelNames: any = {};
  readonly limits: any = {};
  readonly actions: TrelloActionInfo[] = [];
  readonly cards: TrelloCardInfo[] = [];
  readonly checklists: TrelloChecklistInfo[] = [];
  readonly customFields: any[] =[];
  readonly idTags: any[] = [];
  readonly labels: TrelloLabelInfo[] = [];
  readonly lists: TrelloListInfo[] = [];
  readonly members: any[] = [];
}

function toMarkdownHttpUrl(val: string | undefined | null): string | undefined {
  if (!val) return undefined;
  try {
    const url = new URL(val);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    // URL serialization leaves Markdown delimiters unescaped.
    return url.href.replace(/[\\()[\]]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch {
    return undefined;
  }
}

function escapeYamlSingleQuote(val: string | undefined | null): string {
  if (!val) return "";
  return String(val).replace(/\r?\n/g, " ").replace(/'/g, "''");
}

function sortableDate(d: Date | string) : string {
  // Because String.ToDate("YYYYMMDDHHmmSS") is too processed for an artisan language like JS?
  // And no, moment.js is not a good solution - we don't need a new library to do one bit of formatting

  // WTF - card.dateLastActivity is a Date without any date methods.

  const dateStr = typeof d === "string" ? d : (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
  return dateStr.replace(/[^0-9]/g,"").substring(0,14);
}

export type TrelloOptions = ImportOptions & {
  boardIdOrName: string;
  apiKey: string;
  token?: string;
};

export default class TrelloImport implements BaseImporter {
  private static async fetchJsonOrThrow(url: string, context: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${context}: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Downloads board JSON, requesting all cards, lists, checklists, labels, members,
   * and board fields.
   *
   * @param options - An API key and an 8- or 24-character hexadecimal board ID,
   *   or an exact, case-sensitive board name. Name lookup requires a token.
   * @returns The parsed board response, without schema validation.
   * @throws If name lookup lacks a token, the name is not found, or either HTTP
   *   response is unsuccessful. Network and JSON parsing errors also propagate.
   */
  static async downloadBoardJson(options: TrelloOptions): Promise<any> {
    let { boardIdOrName, apiKey, token, verbose } = options;
    // If not a Trello board id (alphanumeric, 8 or 24 chars), look up by name
    if (!/^([0-9a-f]{8}|[0-9a-f]{24})$/i.test(boardIdOrName)) {
      if (verbose) {
        console.log(`Looking up Trello board id for name: ${boardIdOrName}`);
      }
      if (!token) {
        throw new Error("A Trello token (--trello-token) is required to look up boards by name.");
      }
      const boardsUrl = new URL("https://api.trello.com/1/members/me/boards");
      boardsUrl.searchParams.set("key", apiKey);
      boardsUrl.searchParams.set("token", token);
      const boards = await TrelloImport.fetchJsonOrThrow(boardsUrl.toString(), "Trello board lookup");
      const found = boards.find((b: any) => b.name === boardIdOrName);
      if (!found) {
        throw new Error(`Could not find Trello board with name: ${boardIdOrName}`);
      }
      boardIdOrName = found.id;
      if (verbose) {
        console.log(`Resolved board name '${options.boardIdOrName}' to id: ${boardIdOrName}`);
      }
    }
    const url = new URL(`https://api.trello.com/1/boards/${boardIdOrName}`);
    url.searchParams.set("key", apiKey);
    for (const field of ["cards", "lists", "checklists", "labels", "members", "fields"]) {
      url.searchParams.set(field, "all");
    }
    if (token) {
      url.searchParams.set("token", token);
    }
    if (verbose) {
      console.log(`Downloading Trello board ${boardIdOrName}`);
    }
    return TrelloImport.fetchJsonOrThrow(url.toString(), "Trello board download");
  }
  async extractNotes(filename: string) : Promise<TrelloBoardInfo> {
    const contents = await fs.readFile(filename, "utf8");
    const data : TrelloBoardInfo = JSON.parse(contents);

    return data;
  }

  writeCheckList(cl: TrelloChecklistInfo) {
    return "### " + cl.name + "\n\n" +
      cl.checkItems.map(ci => "* [" + (ci.state === "complete" ? "X" : " ") + "] " + ci.name + (ci.due ? " due:" + new Date(ci.due).toISOString() : "")).join("\n");
  }

  writeComments(comments: TrelloCommentInfo[]) {
    return comments.map(c => {
      const author = c.authorName || "Unknown";
      let dateStr = "";
      if (c.date instanceof Date && !Number.isNaN(c.date.getTime())) {
        dateStr = c.date.toISOString();
      } else if (c.date) {
        dateStr = String(c.date);
      }
      const header = dateStr ? `### ${author} (${dateStr})` : `### ${author}`;
      return `${header}\n\n${c.text}`;
    }).join("\n\n");
  }

  async saveAttachments(outputFolder: string, options: TrelloOptions, attachments: AttachmentInfo[]) : Promise<string[]> {
    var filenames: string[] = [];

    for await (var attachment of attachments) {
      // Validate attachment URL protocol to prevent malicious URI scheme injection (e.g., javascript:) and non-HTTP fetches
      const markdownUrl = toMarkdownHttpUrl(attachment.url);
      if (!markdownUrl) {
        if (options.verbose) {
          console.warn(`Skipping attachment with unsafe or invalid URL: ${attachment.url}`);
        }
        continue;
      }
      if (attachment.fileName == null || attachment.fileName === "null" || attachment.fileName === "") {
        // It's a URL
        filenames.push("[" + attachment.name + "](" + markdownUrl + ")");
        continue;
      }
      // Sanitise fileName to prevent path traversal
      const safeFileName = path.basename(attachment.fileName);
      if (safeFileName === "." || safeFileName === "..") {
        filenames.push("[" + attachment.name + "](" + markdownUrl + ")");
        continue;
      }
      const outputFilename = path.join(outputFolder, safeFileName);
      if (options.verbose) {
       console.log(`Writing attachment ${attachment.id} from ${attachment.url} to ${outputFilename} of type ${attachment.mimeType}`);
      }
      try {
        const response = await fetch(attachment.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch attachment [${attachment.name}](${attachment.url}): ${response.status} ${response.statusText}`);
        }
        const data = await response.arrayBuffer();
        await fs.writeFile(outputFilename, Buffer.from(data));
        filenames.push(`![${attachment.name}](${outputFilename})`);
      } catch (error) {
        console.error("Could not write file " + outputFilename + " because " + error);
      }
    }
    return filenames;
  }

  /**
   * Writes or overwrites a Markdown note with frontmatter, description, checklists,
   * and attachment links. File attachments are downloaded under outputFolder/attachments.
   * Failed attachment downloads or writes are omitted without failing the note.
   *
   * @param outputFolder - Destination directory, with or without a trailing separator.
   *   This method does not create it or its attachments subdirectory.
   * @param checklists - Checklists keyed by ID for the card's idChecklists.
   * @param lists - Lists keyed by ID; missing entries use an empty list name.
   * @returns True when the note is written; false if checklist rendering or note writing fails.
   * @throws Errors preparing the filename, attachments, or frontmatter propagate,
   *   including an invalid activity Date.
   */
  async writeCard(outputFolder: string,
      options: TrelloOptions,
      boardName: string,
      card: TrelloCardInfo,
      checklists : { [id: string]: TrelloChecklistInfo; },
      lists : { [id: string]: TrelloListInfo; },
      comments? : TrelloCommentInfo[]) : Promise<boolean> {
    const outputFilename :string = path.join(outputFolder,
      sortableDate(card.dateLastActivity) +
      "-" + this.sanitiseName(card) + ".md");

    const filenames = await this.saveAttachments(path.join(outputFolder, "attachments"), options, card.attachments || []);

    const listName = lists[card.idList]?.name || "";
    const header = "---" +
      "\ncreated: " + card.dateLastActivity +
      "\nmodified: " + card.dateLastActivity +
      "\ntitle: '" + escapeYamlSingleQuote(card.name) + "'" +
      "\nsource: Trello" + 
      "\ntags: [" + (card.labels || []).map(l => "'" + escapeYamlSingleQuote((l?.name || "").replace(/[^A-Za-z0-9]/g, "_")) + "'").join(", ") + "]" +
      "\nreferences: " +
      (card.closed ? "\n closed: true": "") +
      (card.isTemplate ? "\n template: true": "") +
      "\nboard: '" + escapeYamlSingleQuote(boardName) + "'" +
      "\nlist: '" + escapeYamlSingleQuote(listName) + "'" +
      "\npublished: " + listName.includes("Published") +
      "\ntrello-url: '" + escapeYamlSingleQuote(card.shortUrl) + "'" +
      "\n---" +
      "\n\n## " + card.name +
      "\n\n";
    
    try {
      await fs.writeFile(outputFilename,
        header + 
        card.desc + 
        (card.idChecklists.length > 0 ? `\n\n---\n\n## Checklists\n\n${card.idChecklists.map(checklistId => this.writeCheckList(checklists[checklistId])).join("\n\n")}` : "") +
        (comments && comments.length > 0 ? `\n\n---\n\n## Comments\n\n${this.writeComments(comments)}` : "") +
        (filenames.length > 0 ? `\n\n---\n\n## Attachments\n\n* ${filenames.join("\n* ")}` : "")
        , { });
        return true;     
    } catch (error) {
      console.error(`Could not write file ${outputFilename} because ${error}`);
    }
    return false;
  }

  private sanitiseName(card: TrelloCardInfo) {
    return card.name.replace(/[^A-Za-z0-9]/g, '-').slice(0, min(50, card.name.length));
  }

  async importAsync(globpattern: string, outputFolder: string, options: TrelloOptions): Promise<ErrorResponse> {
    // Ensure output folder exists and has a path separator at the end
    if (!outputFolder.endsWith("/")) {
      outputFolder += "/";
    }
    const files = await glob(globpattern);
    var totalCards = 0;
    var totalNotes = 0;
    var checklists : { [id: string]: TrelloChecklistInfo; } = Object.create(null);
    var lists : { [id: string]: TrelloListInfo; } = Object.create(null);
    var labels : { [id: string]: TrelloLabelInfo; } = Object.create(null);
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
      const cardComments: { [cardId: string]: TrelloCommentInfo[] } = Object.create(null);
      notes.actions?.forEach(action => {
        if (action.type === "commentCard" && action.data?.card?.id) {
          const cardId = action.data.card.id;
          const text = action.data.text || "";
          const date = action.date ? new Date(action.date) : new Date();
          const authorName = action.memberCreator?.fullName || action.memberCreator?.username || "";
          if (!cardComments[cardId]) {
            cardComments[cardId] = [];
          }
          cardComments[cardId].push(new TrelloCommentInfo(text, date, authorName));
        }
      });
      for (const cardId in cardComments) {
        cardComments[cardId].sort((a, b) => a.date.getTime() - b.date.getTime());
      }
      for await(const note of notes.cards) {
        if(!note.closed && !note.isTemplate && !lists[note.idList]?.closed && await this.writeCard(outputFolder, options, notes.name, note, checklists, lists, cardComments[note.id] || [])) {
          totalNotes++;
        }
      }
    };    
    return {success: true, message:totalCards + " cards found; " + totalNotes + " notes created."};
  }
}
