import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as yaml from 'yaml';
import * as vscode from 'vscode';
import { ConfigModel } from './configModel';
import { FileModel } from './fileModel';

export class ConfigProvider {

    private static readonly crowdinFileNames = ['crowdin.yml', 'crowdin.yaml'];

    constructor(public readonly workspace: vscode.WorkspaceFolder) { }

    async load(): Promise<ConfigModel> {
        let filePath = '';
        let exists = false;

        for (let i = 0; i < this.fileNames().length; i++) {
            filePath = path.join(this.workspace.uri.fsPath, this.fileNames()[i]);
            exists = await util.promisify(fs.exists)(filePath);
            if (exists) {
                break;
            }
        }

        if (!exists) {
            throw new Error(`Could not find configuration file in ${this.workspace.name}`);
        }

        const file = await util.promisify(fs.readFile)(filePath, 'utf8');
        const config = yaml.parse(file) as PrivateConfigModel;

        this.validate(config);

        return {
            projectId: config.project_identifier,
            apiKey: config.api_key,
            branch: config.branch,
            files: config.files
        };
    }

    protected fileNames(): string[] {
        return ConfigProvider.crowdinFileNames;
    }

    private validate(config: PrivateConfigModel): void {
        if (this.isEmpty(config.api_key)) {
            throw Error(`Api key is empty in ${this.workspace.name}`);
        }
        if (this.isEmpty(config.project_identifier)) {
            throw Error(`Project identifier is empty in ${this.workspace.name}`);
        }
    }

    private isEmpty(prop: string): boolean {
        return !prop || prop.length === 0;
    }
}

interface PrivateConfigModel {
    project_identifier: string;
    api_key: string;
    branch: string;
    files: FileModel[];
}