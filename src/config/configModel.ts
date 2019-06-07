import { FileModel } from './fileModel';

//TODO add base path support (used in upload action (path = relative path - base path) and download actino (unzip archive in base path))
export interface ConfigModel {
    projectId: string;
    apiKey: string;
    branch?: string;
    basePath?: string;
    files: FileModel[];
}