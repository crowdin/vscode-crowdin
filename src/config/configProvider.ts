import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as yaml from 'yaml';
import * as vscode from 'vscode';
import { ConfigModel } from './configModel';
import { FileModel } from './fileModel';

const asyncFileExists = util.promisify(fs.exists);
const asyncReadFile = util.promisify(fs.readFile);

export class ConfigProvider {

    private static readonly crowdinFileNames = ['crowdin.yml', 'crowdin.yaml'];

    constructor(public readonly workspace: vscode.WorkspaceFolder) { }

    async load(): Promise<ConfigModel> {
        let filePath = await this.getFile();

        if (!filePath || filePath === '') {
            throw new Error(`Could not find configuration file in ${this.workspace.name}`);
        }

        const file = await asyncReadFile(filePath, 'utf8');
        const config = yaml.parse(file) as PrivateConfigModel;

        this.validate(config);

        return {
            configPath: filePath,
            projectId: config.project_identifier,
            apiKey: config.api_key,
            branch: config.branch,
            basePath: config.base_path,
            files: config.files
        };
    }

    async getFile(): Promise<string> {
        let filePath = '';
        let exists = false;

        for (let i = 0; i < this.fileNames().length; i++) {
            filePath = path.join(this.workspace.uri.fsPath, this.fileNames()[i]);
            exists = await asyncFileExists(filePath);
            if (exists) {
                break;
            }
        }
        return filePath;
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
        config.files.forEach(file => {
            if (this.isEmpty(file.source)) {
                throw Error(`File source is empty in ${this.workspace.name}`);
            }
            if (this.isEmpty(file.translation)) {
                throw Error(`File translation is empty in ${this.workspace.name}`);
            }
        });
    }

    private isEmpty(prop: string): boolean {
        return !prop || prop.length === 0;
    }
}

interface PrivateConfigModel {
    project_identifier: string;
    api_key: string;
    branch?: string;
    base_path?: string;
    files: FileModel[];
}