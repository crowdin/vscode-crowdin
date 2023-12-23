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
    readonly rootPath: string;
    readonly childs: Promise<BundlesTreeItem[]>;
    readonly bundle: BundlesModel.Bundle | undefined;

    constructor({
        label,
        rootPath,
        collapsibleState,
        config,
        contextValue,
        childs = Promise.resolve([]),
        bundle,
        client,
    }: {
        label: string;
        rootPath: string;
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
        this.rootPath = rootPath;
        this.label = label;
        this.childs = childs;
        this.client = client;
        this.bundle = bundle;
        this.iconPath = {
            light: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'light', 'folder.svg')),
            dark: Constants.EXTENSION_CONTEXT.asAbsolutePath(path.join('resources', 'dark', 'folder.svg')),
        };
    }

    async download(): Promise<void> {
        let unzipFolder = this.rootPath;
        if (!!this.config.basePath) {
            unzipFolder = path.join(unzipFolder, this.config.basePath);
        }
        if (!this.bundle) {
            //this should never happen
            throw new Error('Bundle is missing');
        }
        return this.client.downloadBundle(unzipFolder, this.bundle.id);
    }
}
