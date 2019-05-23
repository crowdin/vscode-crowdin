import * as vscode from 'vscode';
import * as path from 'path';

export class TMSProvider implements vscode.TreeDataProvider<TMSTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TMSTreeItem | undefined> = new vscode.EventEmitter<TMSTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TMSTreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(private workspaceFolders?: vscode.WorkspaceFolder[]) {
    }

    refresh(): void {
        console.log('refresh event invoked');
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TMSTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TMSTreeItem): Thenable<TMSTreeItem[]> {
        //TODO implement
        if (!this.workspaceFolders || this.workspaceFolders.length === 0) {
            vscode.window.showInformationMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            return Promise.resolve([
                new TMSTreeItem('folder', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        } else {
            return Promise.resolve([
                new TMSTreeItem('strings.xml', vscode.TreeItemCollapsibleState.None)
            ]);
        }

    }

}

export class TMSTreeItem extends vscode.TreeItem {

    iconPath = {
        light: path.join(__filename, '..', '..', '..', 'resources', 'light', 'tms.svg'),
        dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', 'tms.svg')
    };

    contextValue = 'tmsItem';
}