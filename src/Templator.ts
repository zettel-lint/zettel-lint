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
        if (!this.notes) return [];

        const fileIds = new Set(this.notes.map(note => '['+note.id+']'));

        return this.notes.filter(note => {
            const refs = note.matchData["Links"] || [];
            return refs.length > 0 && refs.some(refId => !fileIds.has(refId));
        }).map(note => {
            // return a copy of the note with only the refs that aren't in WikiCollector
            const refs = note.matchData["Links"] || [];
            const orphans = refs.filter(refId => !fileIds.has(refId));
            return {
                key: note.id ?? note.filename ?? "",
                // map orphans to formatData
                value: orphans.map(refId => ({id: refId, title: refId, filename: refId, fullpath: undefined, data: [], bag: [note]}))
            };
        })
        ;
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

        this.viewProps = {
            queryCount: 0,
            notes: this.notes,
            created: new Date(),
            modified: new Date(),
            orphans: this.getOrphans(),
            Orphans: this.getOrphans(),
            references: (() => {
                // First collect all referenced IDs
                const referencedIds = new Set<string>();
                this.notes?.forEach(note => {
                    const refs = note.matchData["Links"] || [];
                    refs.forEach(refId => { referencedIds.add(refId.replace(/^\[|\]$/g, '')); });
                });
                // Then filter notes based on the collected IDs
                return this.notes?.filter(note => referencedIds.has(note.id ?? ""));
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
                    // query = {{`tag?sort(by)?set()/filter/`}}
                    const query_extract = /^{{`(?<tag>\w+)(?<fns>(?:\?[\w\s,()]*)*)\/(?<filter>[\s\S]*)\/`}}/;
                    const match = query_extract.exec(text);
                    if (!match || !match.groups) {
                        return render(text);
                    }
                    const { tag, fns, filter } = match.groups;

                    const fnMatches = fns ? [...fns.matchAll(/\?([a-zA-Z0-9_]+)(?:\(([\w\s,]*)\))?/g)] : [];
                    const fnCalls: { fn: string; args: string }[] = fnMatches.map(m => ({
                        fn: m[1].toUpperCase(),
                        args: m[2] ? m[2].trim() : ""
                    }));

                    const validFunctions = new Set(["SORT", "SET", "UNIQUE", "DEDUPE", "DISTINCT"]);
                    for (const call of fnCalls) {
                        if (!validFunctions.has(call.fn)) {
                            return `{{\`unknown function: ${call.fn.toLowerCase()}\`}}`;
                        }
                    }

                    const query_end = text.indexOf("`}}") + 3;

                    let ntag = tag;
                    if (fnCalls.length > 0) {
                        const transformedProp = "s" + view.queryCount++;
                        Object.defineProperty(view, transformedProp, {
                            value: function() {
                                let list = view[tag];
                                if (!list) return [];
                                if (Array.isArray(list)) {
                                    list = [...list];
                                } else {
                                    return list;
                                }

                                for (const { fn, args } of fnCalls) {
                                    if (fn === "SORT") {
                                        let comparator = function (a: any, b: any): 1 | -1 | 0 {
                                            const aKey = a && typeof a === 'object' && 'key' in a ? a.key : (a?.id ?? String(a));
                                            const bKey = b && typeof b === 'object' && 'key' in b ? b.key : (b?.id ?? String(b));
                                            return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
                                        };
                                        if (args && args.length > 0) {
                                            const ccarg = args + ":";
                                            const cc = function(c: any) : string {
                                                if (c && typeof c === 'object') {
                                                    if ('key' in c && typeof c.key === 'string') {
                                                        return c.key.split(ccarg)[1] || "ZZZZZ";
                                                    }
                                                    if (args in c) {
                                                        return String(c[args]);
                                                    }
                                                }
                                                return "ZZZZZ";
                                            };
                                            comparator = function (a: any, b: any): 1 | -1 | 0 {
                                                return cc(a) < cc(b) ? -1 : cc(a) > cc(b) ? 1 : 0;
                                            };
                                        }
                                        list = list.sort(comparator);
                                    } else if (["SET", "UNIQUE", "DEDUPE", "DISTINCT"].includes(fn)) {
                                        const seen = new Set<string>();
                                        const deduplicated: any[] = [];

                                        for (const item of list) {
                                            let itemKey: string;
                                            if (args && args.length > 0 && item && typeof item === 'object') {
                                                if (args in item) {
                                                    itemKey = String(item[args]);
                                                } else if ('key' in item && typeof item.key === 'string' && item.key.includes(args + ":")) {
                                                    itemKey = item.key.split(args + ":")[1] || item.key;
                                                } else {
                                                    itemKey = item.key ?? item.id ?? item.filename ?? JSON.stringify(item);
                                                }
                                            } else if (item && typeof item === 'object') {
                                                itemKey = item.key ?? item.id ?? item.filename ?? JSON.stringify(item);
                                            } else {
                                                itemKey = String(item);
                                            }

                                            if (!seen.has(itemKey)) {
                                                seen.add(itemKey);
                                                if (item && typeof item === 'object' && 'value' in item && Array.isArray(item.value)) {
                                                    const valSeen = new Set<string>();
                                                    const dedupedValue = item.value.filter((val: any) => {
                                                        const valKey = val && typeof val === 'object' ? (val.id ?? val.filename ?? JSON.stringify(val)) : String(val);
                                                        if (valSeen.has(valKey)) return false;
                                                        valSeen.add(valKey);
                                                        return true;
                                                    });
                                                    deduplicated.push({ ...item, value: dedupedValue });
                                                } else {
                                                    deduplicated.push(item);
                                                }
                                            }
                                        }
                                        list = deduplicated;
                                    }
                                }
                                return list;
                            }
                        });
                        ntag = transformedProp;
                    }

                    let rr: RegExp;
                    try {
                        rr = new RegExp(filter);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Invalid regex pattern';
                        return `{{\`error in filter: ${errorMsg}\`}}`;
                    }

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
                    const children = `{{#${ntag}}}{{#${filtered}}}${text.substr(query_end)}{{/${filtered}}}{{/${ntag}}}`;
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
            .replace(/{{[\%]([^}]+)}}/g, (_, expr: string) => {
                const slashIdx = expr.indexOf('/');
                if (slashIdx !== -1) {
                    const tagAndFns = expr.slice(0, slashIdx);
                    const filterAndRest = expr.slice(slashIdx);
                    return `{{#query_filter}}{{\`${tagAndFns}?set()${filterAndRest}\`}}`;
                }
                return `{{#query_filter}}{{\`${expr}?set()//\`}}`;
            })
            .replace(/{{\/[\%](\w*)}}/g, "{{/query_filter}}")
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
