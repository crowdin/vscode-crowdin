import * as vscode from 'vscode';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { ProgressTreeItem } from './progressTreeItem';

export class ProgressTreeProvider implements vscode.TreeDataProvider<ProgressTreeItem>{

    private _onDidChangeTreeData: vscode.EventEmitter<ProgressTreeItem | undefined> = new vscode.EventEmitter<ProgressTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ProgressTreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(readonly configHolder: CrowdinConfigHolder) {
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProgressTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProgressTreeItem): Thenable<any[]> {
        if (!element) {
            return Promise.resolve([]);
            //TODO implement
        } else {
            return element.childs;
        }
    }

}