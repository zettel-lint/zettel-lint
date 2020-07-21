export class ErrorResponse {
    readonly success: boolean = false;
    readonly message : string = "";

}

export interface BaseImporter {
    importAsync(globpattern: string, outputFolder: string) : Promise<ErrorResponse>;
}