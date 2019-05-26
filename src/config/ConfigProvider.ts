import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as yaml from 'yaml';
import { ConfigModel } from './ConfigModel';
import { FileModel } from './FileModel';

export class ConfigProvider {

    private static readonly crowdinFileNames = ['crowdin.yml', 'crowdin.yaml'];

    constructor(public readonly baseDir: string) { }

    async load(): Promise<ConfigModel> {
        let filePath;

        for (let i = 0; i < ConfigProvider.crowdinFileNames.length; i++) {
            filePath = path.join(this.baseDir, ConfigProvider.crowdinFileNames[i]);
            const exists = await util.promisify(fs.exists)(filePath);
            if (exists) {
                break;
            }
        }

        if (!filePath) {
            throw new Error('Could not find configuration file');
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
            throw Error('Api key is empty');
        }
        if (this.isEmpty(config.base_path)) {
            throw Error('Base path is empty');
        }
        if (this.isEmpty(config.project_identifier)) {
            throw Error('Project identifier is empty');
        }
    }

    private isEmpty(prop: string): boolean {
        return !!prop && prop.length > 0;
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