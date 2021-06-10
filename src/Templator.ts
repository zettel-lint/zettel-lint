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
            queryCount: 0,
            notes: this.notes,
            created: new Date(),
            modified: new Date(),
            on(){
                var view = this;
                return function(text: string, render: any) {
                    // query = {{`tag[filter]`}}
                    const query_end = text.indexOf("`}}") + 3
                    const when = text.substr(3, query_end - 6);
                    const changed : Date = view.modified;
                    return render(text) + ` --${when}-- ++${new Date(changed).getUTCDay()}++ **${new Date(view.created).getUTCDay()}**`;
                }
            },
            markdown_escape() {
                return function(text: string, render: any) {
                    return render(text).replace("(", "{").replace(")", "}");
                }
            },
            query_filter() {
                const view = this;
                return function(text: string, render: any) {
                    // query = {{`tag[filter]`}}
                    const query_end = text.indexOf("`}}") + 3
                    const query = text.substr(3, query_end - 6);
                    const tag = query.substr(0, query.indexOf("["));
                    const filter = query.substr(query.indexOf("[")+1, query.length-tag.length-2);
                    const rr = new RegExp(filter);
                    const filtered = "q" + view.queryCount++;
                    Object.defineProperty(view, filtered, {
                        value: function() {
                            return function(text: string, render: any) {
                                const result = render(text);
                                if (rr.test(result)) {
                                    return result;
                                }
                            }
                        }
                    })
                    const children = `{{#${tag}}}{{#${filtered}}}${text.substr(query_end)}{{/${filtered}}}{{/${tag}}}`;
                    return render(children);
                }
            }
        }
        collectors?.forEach(collector =>
            Object.defineProperty(this.viewProps, collector.dataName, 
                {value: [...this.data.get(collector.dataName)?.entries() ?? []].map(this.listToNamedTuple)},
            ));
    }

    listToNamedTuple(input: [string, formatData[]]) {
        return {key: input[0], value: input[1]};
    }

    enhance(template: string): string {
        return template
            // Escaped and non-escaped versions
            .replace(/{{{[``](\w+)}}}/g, "{{#markdown_escape}}{{{$1}}}{{/markdown_escape}}")
            .replace(/{{[``](\w+)}}/g, "{{#markdown_escape}}{{$1}}{{/markdown_escape}}")
            .replace(/{{[\?]([^}]+)}}/g, "{{#query_filter}}{{`$1`}}")
            .replace(/{{\/[\?](\w*)}}/g, "{{/query_filter}}")
/*            .replace(/{{[\@]([^}]+)}}/g, "{{#on}}{{`$1`}}")
            .replace(/{{\/[\@](\w+)}}/g, "{{/on}}")
*/            ;
    }
    
    render(template: string, created: Date | undefined = undefined, modified: Date | undefined = undefined): string {
        const view = this.viewProps ?? {};
        view.created = new Date(created ?? Date.now()).toISOString();
        view.modified = new Date(modified ?? Date.now()).toISOString();
        return Mustache.render(this.enhance(template), view);
    }
}

