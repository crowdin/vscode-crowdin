import * as crowdin from '@crowdin/crowdin-api-client';
import * as vscode from 'vscode';
import { buildClient, ConfigModel } from '../config/configModel';
import { ConfigProvider } from '../config/configProvider';
import { Constants } from '../constants';
import { ErrorHandler } from '../util/errorHandler';

export class CrowdinConfigHolder {
    private configWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private configurationToWorkspace: Map<
        { config: ConfigModel; project: crowdin.ProjectsGroupsModel.Project },
        vscode.WorkspaceFolder
    > = new Map();
    private sourceStrings: Map<vscode.WorkspaceFolder, crowdin.SourceStringsModel.String[]> = new Map();
    private listeners: { (): void }[] = [];
    private initializer: Promise<void> = Promise.resolve();
    private reloadInProgress = false;

    addListener(listener: () => void) {
        this.listeners.push(listener);
    }

    async configurations() {
        await this.initializer;
        return Array.from(this.configurationToWorkspace).sort((e1, e2) => e1[1].index - e2[1].index);
    }

    getCrowdinStrings(workspace: vscode.WorkspaceFolder): crowdin.SourceStringsModel.String[] | undefined {
        return this.sourceStrings.get(workspace);
    }

    reloadStrings() {
        this.configurationToWorkspace.forEach((workspace, info) => this.loadStrings(info.config, workspace));
    }

    initialize() {
        this.initializer = this.load();
    }

    async load() {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        let configFiles: string[] = [];
        this.configurationToWorkspace.clear();
        const promises = workspaceFolders.map(async (workspace) => {
            const configProvider = new ConfigProvider(workspace);
            try {
                const configPath = await configProvider.getFile();
                if (!!configPath) {
                    configFiles.push(configPath);
                }
                const config = await configProvider.load();
                const project = await this.loadProject(config, workspace);
                this.configurationToWorkspace.set({ config, project }, workspace);
                //let's not block and invoke this without await
                this.loadStrings(config, workspace);
                return config;
            } catch (err) {
                ErrorHandler.handleError(err);
            }
        });
        await Promise.all(promises);
        this.updateConfigWatchers(configFiles);
    }

    async reload() {
        //fs watcher may fire events too often
        if (this.reloadInProgress) {
            return;
        }
        this.reloadInProgress = true;
        await this.load();
        this.listeners.forEach((l) => l());
        setTimeout(() => {
            this.reloadInProgress = false;
        }, 1000);
    }

    private updateConfigWatchers(configFiles: string[]) {
        const autoRefresh = vscode.workspace.getConfiguration().get<boolean>(Constants.AUTO_REFRESH_PROPERTY);
        if (!autoRefresh) {
            this.configWatchers.forEach((watcher, _file) => watcher.dispose());
            this.configWatchers.clear();
            return;
        }
        let watchersToRemove: string[] = [];
        let watchersToAdd = configFiles.filter((file) => !this.configWatchers.has(file));
        this.configWatchers.forEach((_watcher, file) => {
            if (!configFiles.includes(file)) {
                watchersToRemove.push(file);
            }
        });
        watchersToRemove.forEach((file) => {
            const watcher = this.configWatchers.get(file);
            if (!!watcher) {
                watcher.dispose();
            }
            this.configWatchers.delete(file);
        });
        watchersToAdd.forEach((file) => {
            const wather = vscode.workspace.createFileSystemWatcher(file);
            wather.onDidChange(() => this.reload());
            wather.onDidDelete(() => this.reload());
            this.configWatchers.set(file, wather);
        });
    }

    private async loadStrings(config: ConfigModel, workspace: vscode.WorkspaceFolder) {
        try {
            const client = buildClient(workspace.uri, config);
            const strings = await client.getStrings();
            this.sourceStrings.set(workspace, strings);
        } catch (e) {
            ErrorHandler.handleError(e);
        }
    }

    private async loadProject(config: ConfigModel, workspace: vscode.WorkspaceFolder) {
        const client = buildClient(workspace.uri, config);
        const project = await client.crowdin.projectsGroupsApi.getProject(config.projectId);
        return project.data;
    }
}
