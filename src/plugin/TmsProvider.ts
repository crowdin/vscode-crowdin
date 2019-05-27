import * as vscode from 'vscode';
import { TmsTreeItem } from './TmsTreeItem';
import { ConfigProvider } from '../config/ConfigProvider';

export class TmsProvider implements vscode.TreeDataProvider<TmsTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TmsTreeItem | undefined> = new vscode.EventEmitter<TmsTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TmsTreeItem | undefined> = this._onDidChangeTreeData.event;

    private workspaceFolders?: vscode.WorkspaceFolder[] = vscode.workspace.workspaceFolders;

    update(download: boolean): void {
        this.workspaceFolders = vscode.workspace.workspaceFolders;
        if (download) {
            //TODO implement download
        }
        this._onDidChangeTreeData.fire();
    }

    save(): void {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Saving all files...`
            },
            (progress, token) => {
                //TODO implement bulk saving
                var p = new Promise(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, 3000);
                });
                return p;
            }
        );
    }

    getTreeItem(element: TmsTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TmsTreeItem): Thenable<TmsTreeItem[]> {
        //TODO implement
        if (!this.workspaceFolders || this.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            return this.buildTree(this.workspaceFolders);
        } else {
            return Promise.resolve([
                new TmsTreeItem('strings.xml', vscode.TreeItemCollapsibleState.None, {
                    command: 'extension.openTmsFile',
                    title: '',
                    arguments: ['strings.xml']
                })
            ]);
        }

    }

    private buildTree(workspaceFolders: vscode.WorkspaceFolder[]): Thenable<TmsTreeItem[]> {
        const promises = workspaceFolders
            .map(async workspace => {
                try {
                    const config = await new ConfigProvider(workspace).load();
                    return new TmsTreeItem(workspace.name, vscode.TreeItemCollapsibleState.Collapsed);
                }
                catch (err) {
                    vscode.window.showWarningMessage(err.message);
                }
                return null as unknown as TmsTreeItem;
            });
        return Promise.all(promises).then(arr => arr.filter(e => e !== null));
    }
}