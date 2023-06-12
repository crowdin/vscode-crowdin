import * as vscode from 'vscode';
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

export function buildClient(docUri: vscode.Uri, config: ConfigModel) {
    return new CrowdinClient(config.projectId, config.apiKey, docUri, config.branch, config.organization);
}
