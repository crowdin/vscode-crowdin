import * as vscode from 'vscode';
import { ConfigModel, buildClient } from '../../../config/configModel';
import { ContextValue } from '../contextValue';
import { BundlesTreeItem } from './bundlesTreeItem';

export class BundlesTreeBuilder {
    static async buildBundlesTree(workspace: vscode.WorkspaceFolder, config: ConfigModel): Promise<BundlesTreeItem> {
        return new BundlesTreeItem({
            workspace,
            label: `${workspace.name} bundles`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: ContextValue.ROOT_BUNDLE,
            config,
            childs: BundlesTreeBuilder.bundlesTreeItems(workspace, config),
        });
    }

    private static async bundlesTreeItems(
        workspace: vscode.WorkspaceFolder,
        config: ConfigModel
    ): Promise<BundlesTreeItem[]> {
        const client = buildClient(workspace.uri, config);
        //TODO pass branch
        const bundles = await client.crowdin.bundlesApi.withFetchAll().listBundles(config.projectId);

        return bundles.data.map(
            (bundle) =>
                new BundlesTreeItem({
                    workspace,
                    label: bundle.data.name,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    contextValue: ContextValue.BUNDLE,
                    config,
                    bundle: bundle.data,
                })
        );
    }
}
