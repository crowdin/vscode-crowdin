import * as vscode from 'vscode';
import { CrowdinClient } from '../../../client/crowdinClient';
import { ConfigModel, buildClient } from '../../../config/configModel';
import { ContextValue } from '../contextValue';
import { BundlesTreeItem } from './bundlesTreeItem';

export class BundlesTreeBuilder {
    static async buildBundlesTree(workspace: vscode.WorkspaceFolder, config: ConfigModel): Promise<BundlesTreeItem> {
        const client = buildClient(workspace.uri, config, true);
        return new BundlesTreeItem({
            client,
            label: workspace.name,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: ContextValue.ROOT_BUNDLE,
            config,
            childs: BundlesTreeBuilder.bundlesTreeItems(config, client),
        });
    }

    private static async bundlesTreeItems(config: ConfigModel, client: CrowdinClient): Promise<BundlesTreeItem[]> {
        const bundles = await client.crowdin.bundlesApi.withFetchAll().listBundles(config.projectId);
        return bundles.data.map(
            (bundle) =>
                new BundlesTreeItem({
                    client,
                    label: bundle.data.name,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    contextValue: ContextValue.BUNDLE,
                    config,
                    bundle: bundle.data,
                })
        );
    }
}
