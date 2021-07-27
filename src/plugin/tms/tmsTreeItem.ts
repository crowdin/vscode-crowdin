import * as path from 'path';
import * as vscode from 'vscode';
import { CrowdinClient } from '../../client/crowdinClient';
import { ConfigModel } from '../../config/configModel';
import { FileModel } from '../../config/fileModel';
import { Constants } from '../../constants';
import { SourceFiles } from '../../model/sourceFiles';
import { PathUtil } from '../../util/pathUtil';
import { TmsTreeItemContextValue } from './tmsTreeItemContextValue';

export class TmsTreeItem extends vscode.TreeItem {

    constructor(
        readonly workspace: vscode.WorkspaceFolder,
        readonly label: string,
        readonly collapsibleState: vscode.TreeItemCollapsibleState,
        readonly childs: Promise<TmsTreeItem[]>,
        readonly config: ConfigModel,
        readonly rootPath: string,
        contextValue: TmsTreeItemContextValue,
        readonly fullPath: string,
        readonly sourceFilesArr: SourceFiles[] = [],
        readonly isLeaf: boolean = false,
        readonly command?: vscode.Command,
        readonly file?: FileModel
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.id = fullPath;
        if (isLeaf) {
            this.resourceUri = vscode.Uri.file(fullPath);
        } else {
            this.iconPath = {
                light: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'light', 'folder.svg')),
                dark: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'dark', 'folder.svg'))
            };
        }
    }

    get client(): CrowdinClient {
        return new CrowdinClient(this.config.projectId, this.config.apiKey, this.config.branch, this.config.organization);
    }

    async update(): Promise<void> {
        let unzipFolder = this.rootPath;
        if (!!this.config.basePath) {
            unzipFolder = path.join(unzipFolder, this.config.basePath);
        }
        return this.client.download(unzipFolder, this.sourceFilesArr);
    }

    async save(): Promise<any> {
        const arr = await this.childs;
        if (this.isLeaf) {
            let basePath = this.rootPath;
            if (!!this.config.basePath) {
                basePath = path.join(basePath, this.config.basePath);
            }
            const file = path.relative(basePath, this.fullPath);
            const exportPattern = PathUtil.replaceDoubleAsteriskInTranslation(
                this.file?.translation || '', this.fullPath, this.file?.source || '', basePath
            );
            return this.client.upload(
                this.fullPath,
                exportPattern,
                file,
                this.file?.updateOption,
                this.file?.excludedTargetLanguages,
                this.file?.labels,
                this.file?.scheme
            );
        } else {
            let promises: Promise<void>[] = [];
            for (const item of arr) {
                promises.push(item.save());
            }
            return Promise.all(promises);
        }
    }

    async updateSourceFile(): Promise<void> {
        let basePath = this.rootPath;
        if (!!this.config.basePath) {
            basePath = path.join(basePath, this.config.basePath);
        }
        const file = path.relative(basePath, this.fullPath);
        return this.client.downloadSourceFile(this.fullPath, file);
    }

    async updateSourceFolder(): Promise<void> {
        const patterns = this.config.files.map(c => c.source);
        let folder = '';
        let fullPath = '';
        if (this.contextValue !== TmsTreeItemContextValue.ROOT) {
            let basePath = this.rootPath;
            if (!!this.config.basePath) {
                basePath = path.join(basePath, this.config.basePath);
            }
            folder = path.relative(basePath, this.fullPath);
            fullPath = this.fullPath;
        } else {
            fullPath = this.rootPath;
            if (!!this.config.basePath) {
                fullPath = path.join(fullPath, this.config.basePath);
            }
        }
        return this.client.downloadSourceFolder(fullPath, folder, patterns);
    }
}