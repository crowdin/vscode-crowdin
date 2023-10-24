import * as vscode from 'vscode';
import { CommonUtil } from '../../util/commonUtil';
import { ErrorHandler } from '../../util/errorHandler';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { FilesTreeBuilder } from './filesTreeBuilder';
import { FilesTreeItem } from './filesTreeItem';

export class FilesProvider implements vscode.TreeDataProvider<FilesTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FilesTreeItem | undefined> = new vscode.EventEmitter<
        FilesTreeItem | undefined
    >();
    readonly onDidChangeTreeData: vscode.Event<FilesTreeItem | undefined> = this._onDidChangeTreeData.event;

    private rootTree: FilesTreeItem[] = [];

    constructor(readonly configHolder: CrowdinConfigHolder) {}

    /**
     * Download translations
     */
    download(folder?: FilesTreeItem): Promise<void> {
        return CommonUtil.withProgress(() => {
            let promises: Promise<void>[];
            if (!!folder) {
                promises = [folder.update().catch((e) => ErrorHandler.handleError(e))];
            } else {
                promises = this.rootTree.map((rootFolder) =>
                    rootFolder.update().catch((e) => ErrorHandler.handleError(e))
                );
            }
            return Promise.all(promises).finally(() => this._onDidChangeTreeData.fire(undefined));
        }, `Downloading translations...`);
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
            () => Promise.all(this.rootTree.map((e) => e.save().catch((e) => ErrorHandler.handleError(e)))),
            `Uploading all files...`
        );
    }

    /**
     * Download source files from Crowdin
     */
    updateSourceFolder(folder?: FilesTreeItem): Promise<any> {
        if (!!folder) {
            return CommonUtil.withProgress(
                () => folder.updateSourceFolder().catch((e) => ErrorHandler.handleError(e)),
                `Updating files in ${folder.label}`
            );
        }
        return CommonUtil.withProgress(
            () =>
                Promise.all(this.rootTree.map((e) => e.updateSourceFolder().catch((e) => ErrorHandler.handleError(e)))),
            `Updating source files...`
        );
    }

    /**
     * Download source file from Crowdin
     */
    updateSourceFile(item: FilesTreeItem): Promise<any> {
        return CommonUtil.withProgress(
            () => item.updateSourceFile().catch((e) => ErrorHandler.handleError(e)),
            `Updating file ${item.label}`
        );
    }

    getTreeItem(element: FilesTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FilesTreeItem): Thenable<FilesTreeItem[]> {
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

    private async buildRootTree(): Promise<FilesTreeItem[]> {
        const configurations = this.configHolder.configurations;
        const promises = Array.from(configurations).map(async ([config, workspace]) => {
            try {
                const rootTreeFolder = await FilesTreeBuilder.buildRootFolder(
                    workspace,
                    config,
                    FilesTreeBuilder.buildSubTree(config, workspace)
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
