import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as yaml from 'yaml';
import * as vscode from 'vscode';
import { ConfigModel } from './ConfigModel';
import { FileModel } from './FileModel';

export class ConfigProvider {

    private static readonly crowdinFileNames = ['crowdin.yml', 'crowdin.yaml'];

    constructor(public readonly workspace: vscode.WorkspaceFolder) { }

    async load(): Promise<ConfigModel> {
        let filePath = '';
        let exists = false;

        for (let i = 0; i < ConfigProvider.crowdinFileNames.length; i++) {
            filePath = path.join(this.workspace.uri.fsPath, ConfigProvider.crowdinFileNames[i]);
            exists = await util.promisify(fs.exists)(filePath);
            if (exists) {
                break;
            }
        }

        if (!exists) {
            throw new Error(`Could not find configuration file in ${this.workspace.name}`);
        }

        const file = await util.promisify(fs.readFile)(filePath, 'utf8');
        const config = yaml.parse(file) as InternalConfigModel;

        this.validate(config);

        return new ConfigModel(
            config.project_identifier,
            config.api_key,
            config.base_path,
            config.files
        );
    }

    private validate(config: InternalConfigModel): void {
        if (this.isEmpty(config.api_key)) {
            throw Error(`Api key is empty in ${this.workspace.name}`);
        }
        if (this.isEmpty(config.base_path)) {
            throw Error(`Base path is empty in ${this.workspace.name}`);
        }
        if (this.isEmpty(config.project_identifier)) {
            throw Error(`Project identifier is empty in ${this.workspace.name}`);
        }
    }

    private isEmpty(prop: string): boolean {
        return !prop || prop.length === 0;
    }
}

class InternalConfigModel {
    constructor(
        public readonly project_identifier: string,
        public readonly api_key: string,
        public readonly base_path: string,
        public readonly files: FileModel[],
    ) { }
}