import { CrowdinClient } from '../client/crowdinClient';
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

export function buildClient(config: ConfigModel) {
    return new CrowdinClient(config.projectId, config.apiKey, config.branch, config.organization);
}
