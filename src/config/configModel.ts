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
    useGitBranch?: boolean;
    files: FileModel[];
}

export function buildClient(docUri: vscode.Uri, config: ConfigModel) {
    const branch = config.useGitBranch ? getGitBranch(docUri) : config.branch;
    return new CrowdinClient(config.projectId, config.apiKey, branch, config.organization);
}

function getGitBranch(docUri: vscode.Uri): string | undefined {
    const extension = vscode.extensions.getExtension('vscode.git');

    if (extension && extension.isActive) {
        const git = extension.exports.getAPI(1);
        const repository = git.getRepository(docUri);
        return repository?.state?.HEAD?.name;
    }
}
