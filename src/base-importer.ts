export class ErrorResponse {
    readonly success: boolean = false;
    readonly message : string = "";

}

export type ImportOptions = {
    verbose?: boolean;
    [key: string]: unknown; // Allow additional options
}

export interface BaseImporter {
    importAsync(globpattern: string, outputFolder: string, options: ImportOptions) : Promise<ErrorResponse>;
}
