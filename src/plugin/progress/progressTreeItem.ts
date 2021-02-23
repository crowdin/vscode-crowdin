import * as vscode from 'vscode';

export class ProgressTreeItem extends vscode.TreeItem {

    constructor(
        readonly label: string,
        readonly collapsibleState: vscode.TreeItemCollapsibleState,
        readonly childs: Promise<ProgressTreeItem[]>
    ) {
        super(label, collapsibleState);
    }
}