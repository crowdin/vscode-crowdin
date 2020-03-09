import { FileModel } from './fileModel';

export interface ConfigModel {
    configPath: string;
    organization?: string;
    projectId: number;
    apiKey: string;
    branch?: string;
    basePath?: string;
    files: FileModel[];
}