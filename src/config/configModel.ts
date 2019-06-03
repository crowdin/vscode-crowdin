import { FileModel } from './fileModel';

export interface ConfigModel {
    projectId: string;
    apiKey: string;
    branch: string;
    files: FileModel[];
}