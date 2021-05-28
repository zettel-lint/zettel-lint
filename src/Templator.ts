import Mustache from 'mustache';
import { Collector } from './Collector';
import { fileWikiLinks, formatData, invertData, invertDictionary } from './types';

export class Templator {
    notes: fileWikiLinks[] | undefined;
    data: Map<string, Map<string, formatData[]>> = new Map<string, Map<string, formatData[]>>();
    collectors: Collector[] | undefined;
    viewProps: any | undefined;

    constructor(files: fileWikiLinks[] | undefined = undefined,
        collectors: Collector[] | undefined = undefined) {
        this.notes = files;
        if (files != undefined && collectors != undefined) {
            collectors.forEach(collector =>
                this.data.set(collector.dataName, 
                    collector.extractAll(files))
            );
            this.collectors = collectors;
        }
        this.viewProps = {
            notes: this.notes,
        }
        collectors?.forEach(collector =>
            Object.defineProperty(this.viewProps, collector.dataName, 
                {value: [...this.data.get(collector.dataName)?.entries() ?? []].map(this.listToNamedTuple)},
            ));
    }

    listToNamedTuple(input: [string, formatData[]]) {
        return {key: input[0], value: input[1]};
    }

    render(template: string, created: Date | undefined = undefined, modified: Date | undefined = undefined): string {
        const view = this.viewProps ?? {};
        view.created = new Date(created ?? Date.now()).toISOString();
        view.modified = new Date(modified ?? Date.now()).toISOString();
        return Mustache.render(template, view);
    }

}