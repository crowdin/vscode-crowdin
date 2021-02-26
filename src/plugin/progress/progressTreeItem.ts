import * as vscode from 'vscode';

export class ProgressTreeItem extends vscode.TreeItem {

    constructor(
        readonly label: string,
        readonly collapsibleState: vscode.TreeItemCollapsibleState,
        readonly childs: Promise<ProgressTreeItem[]>,
        readonly iconPath?: string
    ) {
        super(label, collapsibleState);
    }
}