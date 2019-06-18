import { FileModel } from './fileModel';

export interface ConfigModel {
    configPath: string;
    projectId: string;
    apiKey: string;
    branch?: string;
    basePath?: string;
    files: FileModel[];
}