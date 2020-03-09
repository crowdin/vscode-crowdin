import * as vscode from 'vscode';
import { TmsTreeItem } from './tmsTreeItem';
import { ConfigProvider } from '../config/configProvider';
import { Constants } from '../constants';
import { TmsTreeBuilder } from './tmsTreeBuilder';
import { ErrorHandler } from '../util/ErrorHandler';

export class TmsProvider implements vscode.TreeDataProvider<TmsTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TmsTreeItem | undefined> = new vscode.EventEmitter<TmsTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TmsTreeItem | undefined> = this._onDidChangeTreeData.event;

    private rootTree: TmsTreeItem[] = [];
    private configWatchers: Map<string, vscode.FileSystemWatcher> = new Map();

    update(download: boolean = false, folder?: TmsTreeItem): void {
        if (!download) {
            this._onDidChangeTreeData.fire();
            return;
        }
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Downloading translations...`
            },
            () => {
                let promises: Promise<void>[];
                if (!!folder) {
                    promises = [folder.update().catch(e => ErrorHandler.handleError(e))];
                } else {
                    promises = this.rootTree.map(rootFolder => rootFolder.update().catch(e => ErrorHandler.handleError(e)));
                }
                return Promise.all(promises).finally(() => this._onDidChangeTreeData.fire());
            }
        );
    }

    save(item?: TmsTreeItem): void {
        if (!!item) {
            item.save(true).catch(e => ErrorHandler.handleError(e));
            return;
        }
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Uploading all files...`
            },
            () => {
                const promises = this.rootTree.map(e => e.save().catch(e => ErrorHandler.handleError(e)));
                return Promise.all(promises);
            }
        );
    }

    getTreeItem(element: TmsTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TmsTreeItem): Thenable<TmsTreeItem[]> {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            this.rootTree.length = 0;
            return this.buildRootTree(vscode.workspace.workspaceFolders);
        } else {
            return element.childs;
        }
    }

    private async buildRootTree(workspaceFolders: vscode.WorkspaceFolder[]): Promise<TmsTreeItem[]> {
        let configFiles: string[] = [];
        const promises = workspaceFolders
            .map(async workspace => {
                const configProvider = new ConfigProvider(workspace);
                try {
                    const config = await configProvider.load();
                    configFiles.push(config.configPath);
                    const rootTreeFolder = TmsTreeBuilder.buildRootFolder(workspace, config, TmsTreeBuilder.buildSubTree(config, workspace));
                    this.rootTree.push(rootTreeFolder);
                    return rootTreeFolder;
                }
                catch (err) {
                    ErrorHandler.handleError(err);
                }
                return null as unknown as TmsTreeItem;
            });
        const arr = await Promise.all(promises);
        this.updateConfigWatchers(configFiles);
        return arr.filter(e => e !== null);
    }

    private updateConfigWatchers(configFiles: string[]) {
        const autoRefresh = vscode.workspace.getConfiguration().get<boolean>(Constants.AUTO_REFRESH_PROPERTY);
        if (!autoRefresh) {
            this.configWatchers.forEach((watcher, _file) => watcher.dispose());
            this.configWatchers.clear();
            return;
        }
        let watchersToRemove: string[] = [];
        let watchersToAdd = configFiles.filter(file => !this.configWatchers.has(file));
        this.configWatchers.forEach((_watcher, file) => {
            if (!configFiles.includes(file)) {
                watchersToRemove.push(file);
            }
        });
        watchersToRemove.forEach(file => {
            const watcher = this.configWatchers.get(file);
            if (!!watcher) {
                watcher.dispose();
            }
            this.configWatchers.delete(file);
        });
        watchersToAdd.forEach(file => {
            const wather = vscode.workspace.createFileSystemWatcher(file);
            wather.onDidChange(() => this.update());
            wather.onDidDelete(() => this.update());
            this.configWatchers.set(file, wather);
        });
    }
}