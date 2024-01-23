import * as path from 'path';
import * as vscode from 'vscode';
import { CrowdinClient } from '../../../client/crowdinClient';
import { ConfigModel } from '../../../config/configModel';
import { FileModel } from '../../../config/fileModel';
import { Constants } from '../../../constants';
import { SourceFiles } from '../../../model/sourceFiles';
import { PathUtil } from '../../../util/pathUtil';
import { ContextValue } from '../contextValue';

export class FilesTreeItem extends vscode.TreeItem {
    private client: CrowdinClient;

    readonly childs: Promise<FilesTreeItem[]>;
    readonly config: ConfigModel;
    readonly rootPath: string;
    readonly sourceFilesArr: SourceFiles[];
    readonly isLeaf: boolean;
    readonly file: FileModel | undefined;
    readonly fullPath: string;
    readonly label: string;

    constructor({
        label,
        collapsibleState,
        config,
        rootPath,
        contextValue,
        fullPath,
        childs = Promise.resolve([]),
        sourceFilesArr = [],
        command,
        file,
        client,
    }: {
        label: string;
        collapsibleState: vscode.TreeItemCollapsibleState;
        config: ConfigModel;
        rootPath: string;
        contextValue: ContextValue;
        fullPath: string;
        childs?: Promise<FilesTreeItem[]>;
        sourceFilesArr?: SourceFiles[];
        command?: vscode.Command;
        file?: FileModel;
        client: CrowdinClient;
    }) {
        super(label, collapsibleState);
        this.childs = childs;
        this.config = config;
        this.rootPath = rootPath;
        this.sourceFilesArr = sourceFilesArr;
        this.isLeaf = contextValue === ContextValue.FILE;
        this.file = file;
        this.fullPath = fullPath;
        this.label = label;
        this.contextValue = contextValue;
        this.command = command;
        this.tooltip = '';
        this.id = fullPath;
        if (this.isLeaf) {
            this.resourceUri = vscode.Uri.file(fullPath);
        } else {
            this.iconPath = {
                light: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'light', 'folder.svg')),
                dark: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'dark', 'folder.svg')),
            };
        }
        this.client = client;
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
            return this.client.upload({
                fsPath: this.fullPath,
                exportPattern: exportPattern,
                file: crowdinFilePath,
                uploadOption: this.file?.updateOption,
                excludedTargetLanguages: this.file?.excludedTargetLanguages,
                labels: this.file?.labels,
                scheme: this.file?.scheme,
                type: this.file?.type,
                cleanupMode: this.file?.cleanupMode,
                updateStrings: this.file?.updateStrings,
            });
        } else {
            // for SB we can not upload files in parallel due to concurrency issues
            if (this.client.stringsBased) {
                for (const item of arr) {
                    await item.save();
                }
            } else {
                let promises: Promise<void>[] = [];
                for (const item of arr) {
                    promises.push(item.save());
                }
                return Promise.all(promises);
            }
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
