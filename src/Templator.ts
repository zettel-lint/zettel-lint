import Mustache from 'mustache';
import { Collector } from './Collector';
import { fileWikiLinks, formatData, invertData, invertDictionary } from './types';

export class Templator {
    notes: fileWikiLinks[] | undefined;
    data: Map<string, Map<string, formatData[]>> = new Map<string, Map<string, formatData[]>>();

    private extractData(ref: fileWikiLinks, dataName: string): formatData {
        return {
          ...ref,
          name: dataName,
          data: ref.matchData[dataName]
        };
      };
    constructor(files: fileWikiLinks[] | undefined = undefined,
        collectors: Collector[] | undefined = undefined) {
        this.notes = files;
        if (files != undefined && collectors != undefined) {
            collectors.forEach(collector =>
                this.data.set(collector.dataName, 
                    invertData(files?.map(ref => this.extractData(ref, collector.dataName))))
            );
        }
    }

    render(template: string): string {
        const view = { 
            modified: new Date(Date.now()).toISOString(), 
            notes: this.notes,
            Tasks: [...(this.data.get("Tasks")?.values() ?? [])].flat(),
            Tags: [...(this.data.get("Tags")?.values() ?? [])].flat(),
            x: { ...this.data.entries()}
         };
        return Mustache.render(template, view);
    }

}