import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import * as vscode from 'vscode';
import { CrowdinClient } from '../../../client/crowdinClient';
import { ConfigModel, buildClient } from '../../../config/configModel';
import { ContextValue } from '../contextValue';
import { BundlesTreeItem } from './bundlesTreeItem';

export class BundlesTreeBuilder {
    static async buildBundlesTree(
        workspace: vscode.WorkspaceFolder,
        config: ConfigModel,
        project: ProjectsGroupsModel.Project
    ): Promise<BundlesTreeItem> {
        const client = buildClient(workspace.uri, config, true);
        return new BundlesTreeItem({
            client,
            label: workspace.name,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: ContextValue.ROOT_BUNDLE,
            config,
            rootPath: workspace.uri.fsPath,
            childs: BundlesTreeBuilder.bundlesTreeItems(config, client, workspace.uri.fsPath, project),
            isRoot: true,
            project,
        });
    }

    private static async bundlesTreeItems(
        config: ConfigModel,
        client: CrowdinClient,
        rootPath: string,
        project: ProjectsGroupsModel.Project
    ): Promise<BundlesTreeItem[]> {
        const bundles = await client.crowdin.bundlesApi.withFetchAll().listBundles(config.projectId);
        return bundles.data.map(
            (bundle) =>
                new BundlesTreeItem({
                    client,
                    label: bundle.data.name,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    contextValue: ContextValue.BUNDLE,
                    config,
                    rootPath,
                    bundle: bundle.data,
                    project,
                })
        );
    }
}
