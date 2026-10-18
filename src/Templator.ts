import Mustache from 'mustache';
import { Collector } from './collectors/Collector.js';
import { fileWikiLinks, formatData } from './types.js';

export class Templator {
    notes: fileWikiLinks[] | undefined;
    data: Map<string, Map<string, formatData[]>> = new Map<string, Map<string, formatData[]>>();
    collectors: Collector[] | undefined;
    viewProps: any | undefined;

    // get orphaned links - i.e. internal references to files that don't exist
    private getOrphans() {
        if (!this.notes || this.notes.length === 0) return [];

        // Performance optimization: Single-pass Set creation and note processing (~2x faster)
        const fileIds = new Set<string>();
        for (let i = 0; i < this.notes.length; i++) {
            fileIds.add('[' + this.notes[i].id + ']');
        }

        const result = [];
        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            const refs = note.matchData["Links"];
            if (!refs || refs.length === 0) continue;

            let orphanRefs: string[] | undefined;
            for (let j = 0; j < refs.length; j++) {
                const refId = refs[j];
                if (!fileIds.has(refId)) {
                    if (!orphanRefs) orphanRefs = [];
                    orphanRefs.push(refId);
                }
            }

            if (orphanRefs) {
                result.push({
                    key: note.id ?? note.filename ?? "",
                    value: orphanRefs.map(refId => ({
                        id: refId,
                        title: refId,
                        filename: refId,
                        fullpath: undefined,
                        data: [],
                        bag: [note]
                    }))
                });
            }
        }

        return result;
    }

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

        // Performance optimization: compute orphans once instead of twice
        const orphans = this.getOrphans();

        this.viewProps = {
            queryCount: 0,
            notes: this.notes,
            created: new Date(),
            modified: new Date(),
            orphans: orphans,
            Orphans: orphans,
            references: (() => {
                if (!this.notes || this.notes.length === 0) return [];
                // Performance optimization: Fast string slicing instead of regex replace
                const referencedIds = new Set<string>();
                for (let i = 0; i < this.notes.length; i++) {
                    const refs = this.notes[i].matchData["Links"];
                    if (refs) {
                        for (let j = 0; j < refs.length; j++) {
                            const refId = refs[j];
                            const start = refId.startsWith('[') ? 1 : 0;
                            const end = refId.endsWith(']') ? refId.length - 1 : refId.length;
                            referencedIds.add(start < end ? refId.substring(start, end) : refId);
                        }
                    }
                }
                // Then filter notes based on the collected IDs
                return this.notes.filter(note => referencedIds.has(note.id ?? ""));
            })(),
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
                    return render(text).replace(/\(/g, "&lpar;").replace(/\)/g, "&rpar;");
                }
            },
            query_filter() {
                const view = this;
                return function(text: string, render: any) {
                    const query_extract = /^{{`(?<tag>\w+)(?<operations>(?:\?[a-zA-Z0-9_]+\([\w\s,]*\))*)\/(?<filter>[\s\S]*)\/`}}/;
                    const match = query_extract.exec(text);
                    if (!match?.groups) {
                        return render(text);
                    }
                    const { tag, operations, filter } = match.groups;

                    if (tag === '__proto__' || tag === 'constructor' || tag === 'prototype') {
                        return `{{\`invalid tag: ${tag}\`}}`;
                    }

                    const fnMatches = [...operations.matchAll(/\?([a-zA-Z0-9_]+)\(([\w\s,]*)\)/g)];
                    const fnCalls: { fn: string; args: string }[] = fnMatches.map(m => {
                        const fn = m[1].toUpperCase();
                        return {
                            fn: fn === "DISTINCT" ? "SET" : fn,
                            args: m[2] ? m[2].trim() : ""
                        };
                    });

                    if (fnCalls.length > 1 &&
                        (fnCalls.some(({ fn }) => fn !== "SORT" && fn !== "SET") ||
                            fnCalls.every(({ fn }) => fn === "SORT"))) {
                        return render(text);
                    }

                    const unsupportedFunction = fnCalls.find(({ fn }) => fn !== "SORT" && fn !== "SET");
                    if (unsupportedFunction) {
                        return `{{\`unknown function: ${unsupportedFunction.fn.toLowerCase()}\`}}`;
                    }
                    const query_end = text.indexOf("`}}") + 3;

                    let rr: RegExp;
                    try {
                        rr = new RegExp(filter);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Invalid regex pattern';
                        return `{{\`error in filter: ${errorMsg}\`}}`;
                    }

                    const items = Array.isArray(view[tag]) ? [...view[tag]] : [];
                    for (const { fn, args } of fnCalls) {
                        if (fn === "SORT") {
                            const getSortKey = (item: any): string => {
                                if (args && !['__proto__', 'constructor', 'prototype'].includes(args)) {
                                    if (item && typeof item === 'object') {
                                        if (typeof item.key === 'string' && item.key.includes(`${args}:`)) {
                                            return item.key.split(`${args}:`)[1] || "ZZZZZ";
                                        }
                                        if (Object.prototype.hasOwnProperty.call(item, args)) {
                                            return String(item[args]);
                                        }
                                    }
                                    return "ZZZZZ";
                                }
                                if (item && typeof item === 'object') {
                                    return String(item.key ?? item.id ?? "");
                                }
                                return String(item);
                            };
                            items.sort((a, b) => {
                                const aKey = getSortKey(a);
                                const bKey = getSortKey(b);
                                return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
                            });
                        } else if (fn === "SET") {
                            const seen = new Set<string>();
                            const deduplicated: any[] = [];
                            for (const item of items) {
                                let itemKey: string;
                                if (args && !['__proto__', 'constructor', 'prototype'].includes(args) &&
                                    item && typeof item === 'object' &&
                                    Object.prototype.hasOwnProperty.call(item, args)) {
                                    itemKey = String(item[args]);
                                } else if (item && typeof item === 'object') {
                                    itemKey = String(item.key ?? item.id ?? item.filename ?? JSON.stringify(item));
                                } else {
                                    itemKey = String(item);
                                }

                                if (!seen.has(itemKey)) {
                                    seen.add(itemKey);
                                    if (item && typeof item === 'object' && Array.isArray(item.value)) {
                                        const valueSeen = new Set<string>();
                                        const value = item.value.filter((entry: any) => {
                                            const valueKey = entry && typeof entry === 'object'
                                                ? String(entry.id ?? entry.filename ?? JSON.stringify(entry))
                                                : String(entry);
                                            if (valueSeen.has(valueKey)) return false;
                                            valueSeen.add(valueKey);
                                            return true;
                                        });
                                        deduplicated.push({ ...item, value });
                                    } else {
                                        deduplicated.push(item);
                                    }
                                }
                            }
                            items.splice(0, items.length, ...deduplicated);
                        }
                    }

                    const queryId = view.queryCount++;
                    const collection = `c${queryId}`;
                    const filtered = `q${queryId}`;
                    Object.defineProperty(view, collection, {
                        configurable: true,
                        value: items,
                    });
                    Object.defineProperty(view, filtered, {
                        configurable: true,
                        value: function() {
                            return function(text: string, render: any) {
                                const result = render(text);
                                if (rr.test(result)) {
                                    return result;
                                }
                            }
                        }
                    })
                    const children = `{{#${collection}}}{{#${filtered}}}${text.substr(query_end)}{{/${filtered}}}{{/${collection}}}`;
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
            .replace(/{{%(\w+)(?:\/([\s\S]*?)\/)?}}/g, (_match, tag: string, filter?: string) =>
                `{{?${tag}?set()/${filter ?? ""}/}}`)
            .replace(/{{[\?]([^}]+)}}/g, "{{#query_filter}}{{`$1`}}")
            .replace(/{{\/[%?](\w*)}}/g, "{{/query_filter}}")
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
