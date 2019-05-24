import * as vscode from 'vscode';
import { TmsTreeItem } from './TmsTreeItem';

export class TmsProvider implements vscode.TreeDataProvider<TmsTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TmsTreeItem | undefined> = new vscode.EventEmitter<TmsTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TmsTreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private workspaceFolders?: vscode.WorkspaceFolder[]) {
    }

    update(): void {
        //TODO implement downloading files
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
            vscode.window.showInformationMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            return Promise.resolve([
                new TmsTreeItem('folder', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
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

}