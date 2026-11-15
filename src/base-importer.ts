export interface ErrorResponse {
    readonly success: boolean;
    readonly message: string;
}

export type ImportOptions = {
    verbose?: boolean;
    [key: string]: any; // Allow additional options
}

export interface BaseImporter {
    importAsync(globpattern: string, outputFolder: string, options: ImportOptions) : Promise<ErrorResponse>;
}
