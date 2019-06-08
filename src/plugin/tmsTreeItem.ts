import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigModel } from '../config/configModel';
import { Constants } from '../constants';

export class TmsTreeItem extends vscode.TreeItem {

    contextValue = 'tmsItem';

    constructor(
        readonly label: string,
        readonly collapsibleState: vscode.TreeItemCollapsibleState,
        readonly childs: Promise<TmsTreeItem[]>,
        readonly relativePath: string,
        readonly config?: ConfigModel,
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

    get isLeaf(): boolean {
        return !!this.filePath;
    }

    update(): Promise<void> {
        //TODO implement download
        return new Promise(resolve => {
            setTimeout(() => {
                console.log(`downoading files in ${this.label}`);
                resolve();
            }, 2000);
        });
    }

    async save(progress: boolean = false): Promise<void> {
        const arr = await this.childs;
        if (progress) {
            let title = this.isLeaf
                ? `Saving file ${this.relativePath}`
                : `Saving files in ${this.relativePath}`;
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
            //TODO implement saving
            return new Promise<void>(resolve => {
                setTimeout(() => {
                    console.log(`saved ${this.relativePath}`);
                    resolve();
                }, 1000);
            });
        } else {
            let promises: Promise<any>[] = [];
            for (const item of arr) {
                promises.push(item.save());
            }
            return Promise.all(promises);
        }
    }

    static buildRootFolder(workspace: vscode.WorkspaceFolder, config: ConfigModel, childs: Promise<TmsTreeItem[]>) {
        return new TmsTreeItem(
            workspace.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            childs,
            workspace.name,
            config
        );
    }

    static buildLeaf(label: string, filePath: string, relativePath: string, translation: string, config: ConfigModel): TmsTreeItem {
        return new TmsTreeItem(label, vscode.TreeItemCollapsibleState.None, Promise.resolve([]), relativePath, config, {
            command: Constants.OPEN_TMS_FILE_COMMAND,
            title: '',
            arguments: [filePath],
        }, filePath, translation);
    }

    static buildFolder(label: string, relativePath: string, childs: TmsTreeItem[]) {
        return new TmsTreeItem(label, vscode.TreeItemCollapsibleState.Collapsed, Promise.resolve(childs), relativePath);
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