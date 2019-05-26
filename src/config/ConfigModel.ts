import { FileModel } from "./FileModel";

export class ConfigModel {
    constructor(
        public readonly projectId: string,
        public readonly apiKey: string,
        public readonly basePath: string,
        public readonly files: FileModel[],
    ) { }
}