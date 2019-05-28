import * as vscode from 'vscode';
import * as util from 'util';
import * as glob from 'glob';
import * as path from 'path';
import { TmsTreeItem } from './TmsTreeItem';
import { ConfigProvider } from '../config/ConfigProvider';
import { ConfigModel } from '../config/ConfigModel';

export class TmsProvider implements vscode.TreeDataProvider<TmsTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TmsTreeItem | undefined> = new vscode.EventEmitter<TmsTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TmsTreeItem | undefined> = this._onDidChangeTreeData.event;

    private workspaceFolders: vscode.WorkspaceFolder[] = vscode.workspace.workspaceFolders || [];

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
        if (this.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            return this.buildRootTree(this.workspaceFolders);
        } else {
            return element.childs;
        }

    }

    private buildRootTree(workspaceFolders: vscode.WorkspaceFolder[]): Thenable<TmsTreeItem[]> {
        const promises = workspaceFolders
            .map(async workspace => {
                try {
                    const config = await new ConfigProvider(workspace).load();
                    return new TmsTreeItem(
                        workspace.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        this.buildSubTree(config, workspace)
                    );
                }
                catch (err) {
                    vscode.window.showWarningMessage(err.message);
                }
                return null as unknown as TmsTreeItem;
            });
        return Promise.all(promises).then(arr => arr.filter(e => e !== null));
    }

    private async buildSubTree(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<TmsTreeItem[]> {
        config.files.forEach(async f => {
            const asyncGlob = util.promisify(glob);
            let foundFiles = await asyncGlob(f.source, { root: workspace.uri.fsPath });
            foundFiles = foundFiles.map(e => path.relative(workspace.uri.fsPath, e));
            console.log(`Found for workspace ${workspace.name} | for source ${f.source} : ${foundFiles.join(',')} files`);
        });
        //TODO build sub tree based on found files
        return Promise.resolve([
            new TmsTreeItem('strings.xml', vscode.TreeItemCollapsibleState.None, Promise.resolve([]), {
                command: 'extension.openTmsFile',
                title: '',
                arguments: ['strings.xml'],
            })
        ]);
    }
}