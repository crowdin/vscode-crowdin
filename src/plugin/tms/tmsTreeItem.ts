import * as path from 'path';
import * as vscode from 'vscode';
import { CrowdinClient } from '../../client/crowdinClient';
import { buildClient, ConfigModel } from '../../config/configModel';
import { FileModel } from '../../config/fileModel';
import { Constants } from '../../constants';
import { SourceFiles } from '../../model/sourceFiles';
import { PathUtil } from '../../util/pathUtil';
import { TmsTreeItemContextValue } from './tmsTreeItemContextValue';

export class TmsTreeItem extends vscode.TreeItem {
    private client: CrowdinClient;

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
                dark: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'dark', 'folder.svg')),
            };
        }
        this.client = buildClient(workspace.uri, this.config);
    }

    async update(): Promise<void> {
        let unzipFolder = this.rootPath;
        if (!!this.config.basePath) {
            unzipFolder = path.join(unzipFolder, this.config.basePath);
        }
        //TODO consider dest property for files
        return this.client.download(unzipFolder, this.sourceFilesArr);
    }

    async save(): Promise<any> {
        const arr = await this.childs;
        if (this.isLeaf) {
            let basePath = this.rootPath;
            if (!!this.config.basePath) {
                basePath = path.join(basePath, this.config.basePath);
            }
            const exportPattern = PathUtil.replaceDoubleAsterisk(
                this.file?.translation || '',
                this.fullPath,
                this.file?.source || '',
                basePath
            );
            const crowdinFilePath = this.getCrowdinFilePath();
            return this.client.upload(
                this.fullPath,
                exportPattern,
                crowdinFilePath,
                this.file?.updateOption,
                this.file?.excludedTargetLanguages,
                this.file?.labels,
                this.file?.scheme,
                this.file?.type
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
        const crowdinFilePath = this.getCrowdinFilePath();
        return this.client.downloadSourceFile(this.fullPath, crowdinFilePath);
    }

    async updateSourceFolder(): Promise<any> {
        const arr = await this.childs;
        if (this.isLeaf) {
            return this.updateSourceFile();
        } else {
            let promises: Promise<void>[] = [];
            for (const item of arr) {
                promises.push(item.updateSourceFolder());
            }
            return Promise.all(promises);
        }
    }

    private getCrowdinFilePath(): string {
        let basePath = this.rootPath;
        if (!!this.config.basePath) {
            basePath = path.join(basePath, this.config.basePath);
        }
        if (this.file?.dest) {
            return PathUtil.replaceFileDependentPlaceholders(
                this.file?.dest,
                this.fullPath,
                this.file?.source,
                basePath
            );
        } else {
            return path.relative(basePath, this.fullPath);
        }
    }
}
