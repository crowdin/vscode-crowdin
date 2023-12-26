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

export function buildClient(docUri: vscode.Uri, config: ConfigModel, stringsBased = false) {
    return new CrowdinClient(docUri, config, stringsBased);
}
