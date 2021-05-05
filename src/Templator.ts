import Mustache from 'mustache';
import { Collector } from './Collector';
import { formatData } from './types';

export class Templator {
    notes: formatData[] | undefined;
    collectors: Collector[] | undefined;

    constructor(notes: formatData[] | undefined = undefined, collectors: Collector[] | undefined = undefined) {
        this.notes = notes;
        this.collectors = collectors;
    }

    render(template: string): string {
        const view = { 
            modified: new Date(Date.now()).toISOString(), 
            notes: this.notes,
            collectors: this.collectors
         }
        return Mustache.render(template, view);
    }

}