import { BundlesModel } from '@crowdin/crowdin-api-client';
import * as path from 'path';
import * as vscode from 'vscode';
import { CrowdinClient } from '../../../client/crowdinClient';
import { ConfigModel } from '../../../config/configModel';
import { Constants } from '../../../constants';
import { ContextValue } from '../contextValue';

export class BundlesTreeItem extends vscode.TreeItem {
    private client: CrowdinClient;
    readonly config: ConfigModel;
    readonly label: string;
    readonly childs: Promise<BundlesTreeItem[]>;
    readonly bundle: BundlesModel.Bundle | undefined;

    constructor({
        label,
        collapsibleState,
        config,
        contextValue,
        childs = Promise.resolve([]),
        bundle,
        client,
    }: {
        label: string;
        collapsibleState: vscode.TreeItemCollapsibleState;
        config: ConfigModel;
        contextValue: ContextValue;
        childs?: Promise<BundlesTreeItem[]>;
        bundle?: BundlesModel.Bundle;
        client: CrowdinClient;
    }) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.config = config;
        this.label = label;
        this.childs = childs;
        this.client = client;
        this.bundle = bundle;
        this.iconPath = {
            light: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'light', 'folder.svg')),
            dark: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'dark', 'folder.svg')),
        };
    }
}
