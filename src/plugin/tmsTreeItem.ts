import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigModel } from '../config/configModel';
import { CrowdinClient } from '../client/crowdinClient';
import { TmsTreeItemContextValue } from './tmsTreeItemContextValue';
import { ConfigProvider } from '../config/configProvider';

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
        readonly isLeaf: boolean = false,
        readonly command?: vscode.Command,
        readonly translation?: string
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.id = fullPath;
        if (isLeaf) {
            this.resourceUri = vscode.Uri.file(fullPath);
        } else {
            this.iconPath = {
                light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'folder.svg'),
                dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'folder.svg')
            };
        }
    }

    get client(): CrowdinClient {
        return new CrowdinClient(this.config.projectId, this.config.apiKey, this.config.branch);
    }

    async update(): Promise<void> {
        new ConfigProvider(this.workspace).validate(this.config);
        let unzipFolder = this.rootPath;
        if (!!this.config.basePath) {
            unzipFolder = path.join(unzipFolder, this.config.basePath);
        }
        return this.client.download(unzipFolder);
    }

    async save(progress: boolean = false): Promise<void> {
        new ConfigProvider(this.workspace).validate(this.config);
        const arr = await this.childs;
        if (progress) {
            let title = this.isLeaf
                ? `Uploading file ${this.label}`
                : `Uploading files in ${this.label}`;
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: title
                },
                (progress, token) => {
                    return this._save(arr);
                }
            );
        } else {
            return this._save(arr);
        }
    }

    private _save(arr: TmsTreeItem[]): Promise<any> {
        if (this.isLeaf) {
            let basePath = this.rootPath;
            if (!!this.config.basePath) {
                basePath = path.join(basePath, this.config.basePath);
            }
            const file = path.relative(basePath, this.fullPath);
            return this.client.upload(this.fullPath, this.translation || '', file);
        } else {
            let promises: Promise<any>[] = [];
            for (const item of arr) {
                promises.push(item.save());
            }
            return Promise.all(promises);
        }
    }
}