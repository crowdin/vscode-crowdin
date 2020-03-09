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

        if (isNaN(Number(config.project_id))) {
            throw new Error(`Invalid project id in ${this.workspace.name}`);
        }
        let organization: string | undefined;
        if (!!config.base_url) {
            if ((config.base_url.endsWith('.crowdin.com') || config.base_url.endsWith('.crowdin.com/'))
                && config.base_url.startsWith('https://')) {
                //enterprise
                organization = config.base_url.substring(8).split('.crowdin.com')[0];
            } else if (config.base_url.startsWith('https://crowdin.com')) {
                //standard
                organization = undefined;
            } else {
                //unknown url
                throw new Error(`Invalid base url in ${this.workspace.name}`);
            }
        }
        return {
            configPath: filePath,
            projectId: parseInt(config.project_id),
            apiKey: config.api_token,
            branch: config.branch,
            basePath: config.base_path,
            files: config.files,
            organization: organization
        };
    }

    async getFile(): Promise<string> {
        for (let i = 0; i < this.fileNames().length; i++) {
            const filePath = path.join(this.workspace.uri.fsPath, this.fileNames()[i]);
            const exists = await asyncFileExists(filePath);
            if (exists) {
                return filePath;
            }
        }
        return undefined as unknown as string;
    }

    validate(config: ConfigModel): void {
        if (this.isEmpty(config.apiKey)) {
            throw Error(`Api token is empty in ${this.workspace.name}`);
        }
        if (!config.projectId || config.projectId === 0) {
            throw Error(`Project id is empty in ${this.workspace.name}`);
        }
        if (!!config.basePath) {
            const basePath = path.join(this.workspace.uri.fsPath, config.basePath);
            if (!fs.existsSync(basePath)) {
                throw Error(`Base path ${basePath} was not found. Check your 'base_path' for potential typos and/or capitalization mismatches`);
            }
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

    protected fileNames(): string[] {
        return ConfigProvider.crowdinFileNames;
    }

    private isEmpty(prop: string): boolean {
        return !prop || prop.length === 0;
    }
}

interface PrivateConfigModel {
    project_id: string;
    base_url?: string;
    api_token: string;
    branch?: string;
    base_path?: string;
    files: FileModel[];
}