import * as vscode from 'vscode';
import * as util from 'util';
import * as glob from 'glob';
import * as path from 'path';
import { TmsTreeItem } from './TmsTreeItem';
import { ConfigProvider } from '../config/ConfigProvider';
import { ConfigModel } from '../config/ConfigModel';
import { Constants } from '../Constants';

export class TmsProvider implements vscode.TreeDataProvider<TmsTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TmsTreeItem | undefined> = new vscode.EventEmitter<TmsTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TmsTreeItem | undefined> = this._onDidChangeTreeData.event;

    private workspaceFolders: vscode.WorkspaceFolder[] = vscode.workspace.workspaceFolders || [];
    private rootTree: TmsTreeItem[] = [];

    update(download: boolean = false): void {
        this.workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (!download) {
            this._onDidChangeTreeData.fire();
            return;
        }
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Downloading files from server...`
            },
            (progress, token) => {
                //TODO implement downloading
                var p = new Promise(resolve => {
                    setTimeout(() => {
                        this._onDidChangeTreeData.fire();
                        resolve();
                    }, 3000);
                });
                return p;
            }
        );
    }

    save(): void {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Saving all files...`
            },
            (progress, token) => {
                const promises = this.rootTree.map(e => e.save());
                return Promise.all(promises);
            }
        );
    }

    getTreeItem(element: TmsTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TmsTreeItem): Thenable<TmsTreeItem[]> {
        if (this.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            this.rootTree.length = 0;
            return this.buildRootTree(this.workspaceFolders);
        } else {
            return element.childs || Promise.resolve([]);
        }

    }

    private buildRootTree(workspaceFolders: vscode.WorkspaceFolder[]): Thenable<TmsTreeItem[]> {
        const promises = workspaceFolders
            .map(async workspace => {
                try {
                    const config = await new ConfigProvider(workspace).load();
                    const rootTreeFolder = new TmsTreeItem(
                        workspace.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        this.buildSubTree(config, workspace)
                    );
                    this.rootTree.push(rootTreeFolder);
                    return rootTreeFolder;
                }
                catch (err) {
                    vscode.window.showWarningMessage(err.message);
                }
                return null as unknown as TmsTreeItem;
            });
        return Promise.all(promises).then(arr => arr.filter(e => e !== null));
    }

    private async buildSubTree(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<TmsTreeItem[]> {
        let matrix: Array<Map<string, [string | undefined, string, string, string, boolean]>> = [];
        for (const f of config.files) {
            const asyncGlob = util.promisify(glob);
            let foundFiles = await asyncGlob(f.source, { root: workspace.uri.fsPath });
            let filesParts = foundFiles
                .map(e => path.relative(workspace.uri.fsPath, e))
                .map(filePath => {
                    const fileParts = filePath.split(path.sep);
                    let parentPart: string | undefined;
                    for (let i = 0; i < fileParts.length; i++) {
                        const part = fileParts[i];
                        const isLeaf = i === fileParts.length - 1;
                        if (matrix.length - 1 < i) {
                            matrix[i] = new Map();
                        }
                        matrix[i].set(part, [parentPart, f.translation, path.join(workspace.uri.fsPath, filePath), filePath, isLeaf]);
                        parentPart = part;
                    }
                });
        }
        let subtree: TmsTreeItem[] = [];
        let childs: Map<string, TmsTreeItem[]> = new Map();
        for (let i = matrix.length - 1; i >= 0; i--) {
            const map = matrix[i];
            let temp = new Map(childs);
            childs.clear();
            map.forEach(([parent, translation, path, relativePath, isLeaf], label) => {
                let item;
                if (isLeaf) {
                    item = this.buildLeaf(label, path, relativePath, translation, config);
                } else {
                    item = this.buildFolder(label, (temp.get(label) || []).sort(this.sort));
                }
                if (!!parent) {
                    let childElements = childs.get(parent) || [];
                    childElements.push(item);
                    childs.set(parent, childElements);
                } else {
                    subtree.push(item);
                }
            });
        }
        return subtree.sort(this.sort);
    }

    private buildLeaf(label: string, filePath: string, relativePath: string, translation: string, config: ConfigModel): TmsTreeItem {
        return new TmsTreeItem(label, vscode.TreeItemCollapsibleState.None, Promise.resolve([]), {
            command: Constants.OPEN_TMS_FILE_COMMAND,
            title: '',
            arguments: [filePath],
        }, filePath, relativePath, translation, config);
    }

    private buildFolder(label: string, childs: TmsTreeItem[]) {
        return new TmsTreeItem(label, vscode.TreeItemCollapsibleState.Collapsed, Promise.resolve(childs));
    }

    private sort(e1: TmsTreeItem, e2: TmsTreeItem): number {
        if (e1.collapsibleState === e2.collapsibleState) {
            if (e1.label < e2.label) { return -1; }
            if (e1.label > e2.label) { return 1; }
            return 0;
        }
        return e1.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? -1 : 1;
    }
}