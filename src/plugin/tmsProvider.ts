import * as vscode from 'vscode';
import * as util from 'util';
import * as glob from 'glob';
import * as path from 'path';
import { TmsTreeItem } from './tmsTreeItem';
import { ConfigProvider } from '../config/configProvider';
import { ConfigModel } from '../config/configModel';

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
            async () => {
                const promises = this.rootTree.map(rootFolder => rootFolder.update());
                await Promise.all(promises);
                return this._onDidChangeTreeData.fire();
            }
        );
    }

    save(): void {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Saving all files...`
            },
            () => {
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
            return element.childs;
        }
    }

    private async buildRootTree(workspaceFolders: vscode.WorkspaceFolder[]): Promise<TmsTreeItem[]> {
        const promises = workspaceFolders
            .map(async workspace => {
                try {
                    const config = await new ConfigProvider(workspace).load();
                    const rootTreeFolder = TmsTreeItem.buildRootFolder(workspace, config, this.buildSubTree(config, workspace));
                    this.rootTree.push(rootTreeFolder);
                    return rootTreeFolder;
                }
                catch (err) {
                    vscode.window.showWarningMessage(err.message);
                }
                return null as unknown as TmsTreeItem;
            });
        const arr = await Promise.all(promises);
        return arr.filter(e => e !== null);
    }

    protected async buildSubTree(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<TmsTreeItem[]> {
        let matrix = await this.buildFilesMatrix(config, workspace);
        let subtree: TmsTreeItem[] = [];
        let childs: Map<string, TmsTreeItem[]> = new Map();
        for (let i = matrix.length - 1; i >= 0; i--) {
            const map = matrix[i];
            let temp = new Map(childs);
            childs.clear();
            map.forEach(([parent, translation, fullPath, relativePath, isLeaf], label) => {
                let item;
                if (isLeaf) {
                    item = TmsTreeItem.buildLeaf(label, fullPath, relativePath, translation, config);
                } else {
                    item = TmsTreeItem.buildFolder(label, relativePath, (temp.get(label) || []).sort(TmsTreeItem.compare));
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
        return subtree.sort(TmsTreeItem.compare);
    }

    protected async buildFilesMatrix(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<Array<Map<string, [string | undefined, string, string, string, boolean]>>> {
        let matrix: Array<Map<string, [string | undefined, string, string, string, boolean]>> = [];
        const root = !!config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
        const promises = config.files.map(async f => {
            const asyncGlob = util.promisify(glob);
            let foundFiles = await asyncGlob(f.source, { root: root });
            foundFiles
                .map(e => path.relative(workspace.uri.fsPath, e))
                .forEach(filePath => {
                    const fileParts = filePath.split(path.sep);
                    let parentPart: string | undefined;
                    for (let i = 0; i < fileParts.length; i++) {
                        const part = fileParts[i];
                        const isLeaf = i === fileParts.length - 1;
                        if (matrix.length - 1 < i) {
                            matrix[i] = new Map();
                        }
                        const fsPath = path.join(workspace.uri.fsPath, filePath);
                        const relativePath = path.join(workspace.name, ...fileParts.slice(0, i + 1));
                        matrix[i].set(part, [parentPart, f.translation, fsPath, relativePath, isLeaf]);
                        parentPart = part;
                    }
                });
            return foundFiles;
        });
        await Promise.all(promises);
        return matrix;
    }
}