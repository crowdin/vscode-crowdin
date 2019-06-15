import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigModel } from '../config/configModel';
import { Constants } from '../constants';
import { CrowdinClient } from '../client/crowdinClient';

export class TmsTreeItem extends vscode.TreeItem {

    contextValue = 'tmsItem';

    constructor(
        readonly label: string,
        readonly collapsibleState: vscode.TreeItemCollapsibleState,
        readonly childs: Promise<TmsTreeItem[]>,
        readonly config: ConfigModel,
        readonly rootPath: string,
        readonly command?: vscode.Command,
        readonly filePath?: string,
        readonly translation?: string
    ) {
        super(label, collapsibleState);
        if (!!filePath) {
            this.resourceUri = vscode.Uri.file(filePath);
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

    update(): Promise<void> {
        let unzipFolder = this.rootPath;
        if (!!this.config.basePath) {
            unzipFolder = path.join(unzipFolder, this.config.basePath);
        }
        return this.client.download(unzipFolder);
    }

    async save(progress: boolean = false): Promise<void> {
        const arr = await this.childs;
        if (progress) {
            let title = !!this.filePath && !!this.translation
                ? `Saving file ${this.label}`
                : `Saving files in ${this.label}`;
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

    private async _save(arr: TmsTreeItem[]): Promise<any> {
        if (!!this.filePath && !!this.translation) {
            let basePath = this.rootPath;
            if (!!this.config.basePath) {
                basePath = path.join(basePath, this.config.basePath);
            }
            const file = path.relative(basePath, this.filePath);
            return this.client.upload(this.filePath, this.translation, file);
        } else {
            //Uncomment it when back end will be fixed
            // let promises: Promise<any>[] = [];
            // for (const item of arr) {
            //     promises.push(item.save());
            // }
            // return Promise.all(promises);
            //!NOTE do save in sequantial manner as it might create multiple branches on back end
            for (const item of arr) {
                await item.save();
            }
        }
    }

    static buildRootFolder(workspace: vscode.WorkspaceFolder, config: ConfigModel, childs: Promise<TmsTreeItem[]>) {
        return new TmsTreeItem(
            workspace.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            childs,
            config,
            workspace.uri.fsPath
        );
    }

    static buildLeaf(workspace: vscode.WorkspaceFolder, label: string, filePath: string, translation: string, config: ConfigModel): TmsTreeItem {
        return new TmsTreeItem(label, vscode.TreeItemCollapsibleState.None, Promise.resolve([]), config, workspace.uri.fsPath, {
            command: Constants.OPEN_TMS_FILE_COMMAND,
            title: '',
            arguments: [filePath],
        }, filePath, translation);
    }

    static buildFolder(workspace: vscode.WorkspaceFolder, label: string, childs: TmsTreeItem[], config: ConfigModel) {
        return new TmsTreeItem(label, vscode.TreeItemCollapsibleState.Collapsed, Promise.resolve(childs), config, workspace.uri.fsPath);
    }

    static compare(e1: TmsTreeItem, e2: TmsTreeItem): number {
        if (e1.collapsibleState === e2.collapsibleState) {
            if (e1.label < e2.label) { return -1; }
            if (e1.label > e2.label) { return 1; }
            return 0;
        }
        return e1.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? -1 : 1;
    }
}