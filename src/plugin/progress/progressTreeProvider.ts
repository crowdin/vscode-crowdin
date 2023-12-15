import * as path from 'path';
import * as vscode from 'vscode';
import { buildClient } from '../../config/configModel';
import { Constants } from '../../constants';
import { ErrorHandler } from '../../util/errorHandler';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { ProgressTreeItem } from './progressTreeItem';

export class ProgressTreeProvider implements vscode.TreeDataProvider<ProgressTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProgressTreeItem | undefined> = new vscode.EventEmitter<
        ProgressTreeItem | undefined
    >();
    readonly onDidChangeTreeData: vscode.Event<ProgressTreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(readonly configHolder: CrowdinConfigHolder) {}

    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: ProgressTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ProgressTreeItem): Promise<any[]> {
        if (!element) {
            const configurations = await this.configHolder.configurations();
            const promises = Array.from(configurations).map(async ([config, workspace]) => {
                try {
                    const client = buildClient(workspace.uri, config);
                    const { translationStatusApi, projectsGroupsApi, languagesApi } = client.crowdin;
                    const languages = await languagesApi.withFetchAll().listSupportedLanguages();
                    const project = await projectsGroupsApi.getProject(config.projectId);
                    const progress = await translationStatusApi.withFetchAll().getProjectProgress(config.projectId);
                    const languagesProgress = progress.data.map((languageProgress) => {
                        const language = languages.data.find((l) => l.data.id === languageProgress.data.languageId);
                        return new ProgressTreeItem(
                            language ? language.data.name : languageProgress.data.languageId,
                            vscode.TreeItemCollapsibleState.Collapsed,
                            Promise.resolve([
                                new ProgressTreeItem(
                                    `Translated ${languageProgress.data.translationProgress}%`,
                                    vscode.TreeItemCollapsibleState.None,
                                    Promise.resolve([]),
                                    Constants.EXTENSION_CONTEXT.asAbsolutePath(
                                        path.join('resources', 'common', 'translated.svg')
                                    )
                                ),
                                new ProgressTreeItem(
                                    `Approved ${languageProgress.data.approvalProgress}%`,
                                    vscode.TreeItemCollapsibleState.None,
                                    Promise.resolve([]),
                                    Constants.EXTENSION_CONTEXT.asAbsolutePath(
                                        path.join('resources', 'common', 'approved.svg')
                                    )
                                ),
                            ])
                        );
                    });
                    return new ProgressTreeItem(
                        `${workspace.name} (project ${project.data.name})`,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        Promise.resolve(languagesProgress)
                    );
                } catch (err) {
                    ErrorHandler.handleError(err);
                }
                return null as unknown as ProgressTreeItem;
            });
            return Promise.all(promises).then((arr) => arr.filter((e) => e !== null));
        } else {
            return element.childs;
        }
    }
}
