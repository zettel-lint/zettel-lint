export class ErrorResponse {
    readonly success: boolean = false;
    readonly message : string = "";

}

interface BaseImporter {
    /**
     * import */
    public import(globpattern: string) : ErrorResponse {
        
    }
}