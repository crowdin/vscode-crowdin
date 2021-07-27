import { SourceFilesModel } from '@crowdin/crowdin-api-client';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { ConfigModel } from './configModel';
import { FileModel, Scheme } from './fileModel';

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

        return this.validateAndGet(config, filePath);
    }

    async getFile(): Promise<string | undefined> {
        for (let i = 0; i < this.fileNames().length; i++) {
            const filePath = path.join(this.workspace.uri.fsPath, this.fileNames()[i]);
            const exists = await asyncFileExists(filePath);
            if (exists) {
                return filePath;
            }
        }
        return undefined as unknown as string;
    }

    private validateAndGet(config: PrivateConfigModel, filePath: string): ConfigModel {
        const projectId: string | undefined = this.getOrEnv(config, 'project_id', 'project_id_env');
        if (!projectId) {
            throw new Error(`Missing "project_id" property in ${this.workspace.name}`);
        }
        if (isNaN(Number(projectId))) {
            throw new Error(`Project id is not a number in ${this.workspace.name}`);
        }
        const apiKey: string | undefined = this.getOrEnv(config, 'api_token', 'api_token_env');
        if (!apiKey) {
            throw new Error(`Missing "api_token" property in ${this.workspace.name}`);
        }
        const basePath = this.getOrEnv(config, 'base_path', 'base_path_env');
        if (!!basePath) {
            const fullPath = path.join(this.workspace.uri.fsPath, basePath);
            if (!fs.existsSync(fullPath)) {
                throw Error(`Base path ${fullPath} was not found. Check your 'base_path' for potential typos and/or capitalization mismatches`);
            }
        }
        config.files.forEach(file => {
            if (this.isEmpty(file.source)) {
                throw Error(`File source is empty in ${this.workspace.name}`);
            }
            if (this.isEmpty(file.translation)) {
                throw Error(`File translation is empty in ${this.workspace.name}`);
            }
            if (file.update_option && !this.getFileUpdateOption(file.update_option)) {
                throw Error(`Invalid file update option value in ${this.workspace.name}`);
            }
            if (file.excluded_target_languages
                && (!Array.isArray(file.excluded_target_languages) || file.excluded_target_languages.some(l => typeof l !== 'string'))) {
                throw Error(`Invalid value in file excluded_target_languages property in ${this.workspace.name}. It should be an array of language codes`);
            }
            if (file.labels && (!Array.isArray(file.labels) || file.labels.some(l => typeof l !== 'string'))) {
                throw Error(`Invalid value in file labels property in ${this.workspace.name}. It should be an array of labels`);
            }
            if (file.scheme && typeof file.scheme !== 'string') {
                throw Error(`Invalid value in file scheme property ${this.workspace.name}. It should be a string with columns information`);
            }
        });
        let organization: string | undefined;
        const baseUrl: string | undefined = this.getOrEnv(config, 'base_url', 'base_url_env');
        if (!!baseUrl) {
            if ((baseUrl.endsWith('.crowdin.com') || baseUrl.endsWith('.crowdin.com/'))
                && baseUrl.startsWith('https://')) {
                //enterprise
                organization = baseUrl.substring(8).split('.crowdin.com')[0];
            } else if (baseUrl.startsWith('https://crowdin.com')) {
                //standard
                organization = undefined;
            } else {
                //unknown url
                throw new Error(`Invalid base url in ${this.workspace.name}`);
            }
        }
        return {
            configPath: filePath,
            projectId: parseInt(projectId || ''),
            apiKey: apiKey || '',
            branch: config.branch,
            basePath,
            files: config.files.map(f => {
                return {
                    source: f.source,
                    translation: f.translation,
                    updateOption: this.getFileUpdateOption(f.update_option),
                    excludedTargetLanguages: f.excluded_target_languages,
                    labels: f.labels,
                    scheme: this.getFileScheme(f.scheme)
                } as FileModel;
            }),
            organization: organization
        };
    }

    protected fileNames(): string[] {
        return ConfigProvider.crowdinFileNames;
    }

    private isEmpty(prop: string): boolean {
        return !prop || prop.length === 0;
    }

    private getOrEnv(obj: any, key: string, envKey: string): string | undefined {
        if (!!obj[key]) {
            return obj[key];
        }
        if (!!obj[envKey]) {
            const envValue = process.env[obj[envKey]];
            if (!envValue) {
                throw new Error(`The environment variable "${obj[envKey]}" is not set`);
            }
            return process.env[obj[envKey]];
        }
    }

    private getFileUpdateOption(value?: string): SourceFilesModel.UpdateOption | undefined {
        switch (value) {
            case 'update_as_unapproved':
                return SourceFilesModel.UpdateOption.KEEP_TRANSLATIONS;
            case 'update_without_changes':
                return SourceFilesModel.UpdateOption.KEEP_TRANSLATIONS_AND_APPROVALS;
        }
    }

    private getFileScheme(value?: string): Scheme | undefined {
        let scheme: Scheme | undefined;
        if (value) {
            scheme = {}
            const schemeParts = value.split(',');
            for (let i = 0; i < schemeParts.length; i++) {
                scheme[schemeParts[i].trim()] = i;
            }
        }
        return scheme;
    }
}

interface PrivateConfigModel {
    project_id: string;
    project_id_env: string;
    base_url?: string;
    base_url_env?: string;
    api_token: string;
    api_token_env: string;
    branch?: string;
    base_path?: string;
    base_path_env?: string;
    files: PrivateFileModel[];
}

interface PrivateFileModel {
    source: string;
    translation: string;
    update_option?: string;
    excluded_target_languages?: string[];
    labels?: string[];
    scheme?: string;
}