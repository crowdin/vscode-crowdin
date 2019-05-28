import { FileModel } from './FileModel';

export interface ConfigModel {
    projectId: string;
    apiKey: string;
    basePath: string;
    files: FileModel[];
}