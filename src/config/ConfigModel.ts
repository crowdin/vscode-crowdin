import { FileModel } from './FileModel';

export interface ConfigModel {
    projectId: string;
    apiKey: string;
    basePath: string;
    branch: string;
    files: FileModel[];
}