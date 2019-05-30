import { FileModel } from './FileModel';

export interface ConfigModel {
    projectId: string;
    apiKey: string;
    branch: string;
    files: FileModel[];
}