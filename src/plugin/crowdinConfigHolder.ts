import * as vscode from 'vscode';
import { ConfigModel } from '../config/configModel';
import { ConfigProvider } from '../config/configProvider';
import { Constants } from '../constants';
import { ErrorHandler } from '../util/errorHandler';

export class CrowdinConfigHolder {
    private configWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private configurationToWorkspace: Map<ConfigModel, vscode.WorkspaceFolder> = new Map();
    private listeners: { (): void; }[] = [];

    addListener(listener: () => void) {
        this.listeners.push(listener);
    }

    get configurations(): Map<ConfigModel, vscode.WorkspaceFolder> {
        return this.configurationToWorkspace;
    }

    async load() {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        let configFiles: string[] = [];
        this.configurationToWorkspace.clear();
        const promises = workspaceFolders
            .map(async workspace => {
                const configProvider = new ConfigProvider(workspace);
                try {
                    const configPath = await configProvider.getFile();
                    if (!!configPath) {
                        configFiles.push(configPath);
                    }
                    const config = await configProvider.load();
                    this.configurationToWorkspace.set(config, workspace);
                    return config;
                }
                catch (err) {
                    ErrorHandler.handleError(err);
                }
            });
        await Promise.all(promises);
        this.updateConfigWatchers(configFiles);
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
            wather.onDidChange(async () => {
                await this.load();
                this.listeners.forEach(l => l());
            });
            wather.onDidDelete(async () => {
                await this.load();
                this.listeners.forEach(l => l());
            });
            this.configWatchers.set(file, wather);
        });
    }
}