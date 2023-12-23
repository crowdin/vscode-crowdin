import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import * as vscode from 'vscode';
import { buildClient } from '../../config/configModel';
import { Constants } from '../../constants';
import { AUTH_TYPE, SCOPES } from '../../oauth/constants';
import { CommonUtil } from '../../util/commonUtil';
import { ErrorHandler } from '../../util/errorHandler';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { BundlesTreeBuilder } from './bundles/bundlesTreeBuilder';
import { BundlesTreeItem } from './bundles/bundlesTreeItem';
import { FilesTreeBuilder } from './files/filesTreeBuilder';
import { FilesTreeItem } from './files/filesTreeItem';

type TreeItem = FilesTreeItem | BundlesTreeItem;

export class TreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<
        TreeItem | undefined
    >();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    private rootTree: TreeItem[] = [];

    private showWelcomeMessage = true;

    constructor(readonly configHolder: CrowdinConfigHolder, readonly isDownload: boolean) {}

    /**
     * Download translations
     */
    download(folder: FilesTreeItem): Promise<void> {
        return CommonUtil.withProgress<void>(
            () =>
                folder
                    .update()
                    .catch((e) => ErrorHandler.handleError(e))
                    .finally(() => this._onDidChangeTreeData.fire(undefined)),
            `Downloading translations...`
        );
    }

    /**
     * Reload files tree
     */
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Send file(s) to Crowdin
     */
    save(item?: FilesTreeItem): Promise<any> {
        if (!!item) {
            const title = item.isLeaf ? `Uploading file ${item.label}` : `Uploading files in ${item.label}`;
            return CommonUtil.withProgress(() => item.save().catch((e) => ErrorHandler.handleError(e)), title);
        }
        return CommonUtil.withProgress(
            () =>
                Promise.all(
                    this.rootTree
                        .map((e) => e as FilesTreeItem)
                        .map((e) => e.save().catch((e) => ErrorHandler.handleError(e)))
                ),
            `Uploading all files...`
        );
    }

    /**
     * Download source files from Crowdin
     */
    updateSourceFolder(folder: FilesTreeItem): Promise<any> {
        return CommonUtil.withProgress(
            () => folder.updateSourceFolder().catch((e) => ErrorHandler.handleError(e)),
            `Updating files in ${folder.label}`
        );
    }

    /**
     * Download source file from Crowdin
     */
    async updateSourceFile(item: FilesTreeItem): Promise<any> {
        return CommonUtil.withProgress(
            () => item.updateSourceFile().catch((e) => ErrorHandler.handleError(e)),
            `Updating file ${item.label}`
        );
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        Constants.APPLICATION_OPENED = true;
        if (!element && this.showWelcomeMessage) {
            const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });
            if (session) {
                vscode.window.showInformationMessage(`Welcome back ${session.account.label}`);
            }
            this.showWelcomeMessage = false;
        }

        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Project workspace is empty');
            return Promise.resolve([]);
        }
        if (!element) {
            this.rootTree.length = 0;
            return this.buildRootTree();
        } else {
            return element.childs;
        }
    }

    private async buildRootTree(): Promise<TreeItem[]> {
        const configurations = await this.configHolder.configurations();
        const promises = Array.from(configurations).map(async ([{ config, project }, workspace]) => {
            try {
                const isStringsBased = project.type === ProjectsGroupsModel.Type.STRINGS_BASED;
                if (this.isDownload && isStringsBased) {
                    const rootTreeFolder = await BundlesTreeBuilder.buildBundlesTree(workspace, config);
                    this.rootTree.push(rootTreeFolder);
                    return rootTreeFolder;
                }

                const client = buildClient(workspace.uri, config, isStringsBased);

                const rootTreeFolder = await FilesTreeBuilder.buildRootFolder(
                    workspace,
                    config,
                    FilesTreeBuilder.buildSubTree(config, workspace, client),
                    client
                );
                this.rootTree.push(rootTreeFolder);
                return rootTreeFolder;
            } catch (err) {
                ErrorHandler.handleError(err);
            }
            return null as unknown as FilesTreeItem;
        });
        const arr = await Promise.all(promises);
        return arr.filter((e) => e !== null);
    }
}
