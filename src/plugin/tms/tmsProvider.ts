import * as vscode from 'vscode';
import { CommonUtil } from '../../util/commonUtil';
import { ErrorHandler } from '../../util/errorHandler';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';
import { TmsTreeBuilder } from './tmsTreeBuilder';
import { TmsTreeItem } from './tmsTreeItem';

export class TmsProvider implements vscode.TreeDataProvider<TmsTreeItem>  {

    private _onDidChangeTreeData: vscode.EventEmitter<TmsTreeItem | undefined> = new vscode.EventEmitter<TmsTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TmsTreeItem | undefined> = this._onDidChangeTreeData.event;

    private rootTree: TmsTreeItem[] = [];

    constructor(readonly configHolder: CrowdinConfigHolder) {
    }

    /**
     * Download translations
     */
    download(folder?: TmsTreeItem): Promise<void> {
        return CommonUtil.withProgress(
            () => {
                let promises: Promise<void>[];
                if (!!folder) {
                    promises = [folder.update().catch(e => ErrorHandler.handleError(e))];
                } else {
                    promises = this.rootTree.map(rootFolder => rootFolder.update().catch(e => ErrorHandler.handleError(e)));
                }
                return Promise.all(promises).finally(() => this._onDidChangeTreeData.fire());
            },
            `Downloading translations...`
        );
    }

    /**
     * Reload files tree
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Send file(s) to Crowdin
     */
    save(item?: TmsTreeItem): Promise<any> {
        if (!!item) {
            const title = item.isLeaf ? `Uploading file ${item.label}` : `Uploading files in ${item.label}`;
            return CommonUtil.withProgress(
                () => item.save().catch(e => ErrorHandler.handleError(e)),
                title
            );
        }
        return CommonUtil.withProgress(
            () => Promise.all(this.rootTree.map(e => e.save().catch(e => ErrorHandler.handleError(e)))),
            `Uploading all files...`
        );
    }

    /**
     * Download source files from Crowdin
     */
    updateSourceFolder(folder?: TmsTreeItem): Promise<any> {
        if (!!folder) {
            return CommonUtil.withProgress(
                () => folder.updateSourceFolder().catch(e => ErrorHandler.handleError(e)),
                `Updating files in ${folder.label}`
            );
        }
        return CommonUtil.withProgress(
            () => Promise.all(this.rootTree.map(e => e.updateSourceFolder().catch(e => ErrorHandler.handleError(e)))),
            `Updating source files...`
        );
    }

    /**
     * Download source file from Crowdin
     */
    updateSourceFile(item: TmsTreeItem): Promise<any> {
        return CommonUtil.withProgress(
            () => item.updateSourceFile().catch(e => ErrorHandler.handleError(e)),
            `Updating file ${item.label}`
        );
    }

    getTreeItem(element: TmsTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TmsTreeItem): Thenable<TmsTreeItem[]> {
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

    private async buildRootTree(): Promise<TmsTreeItem[]> {
        const configurations = this.configHolder.configurations;
        const promises = Array.from(configurations)
            .map(async ([config, workspace]) => {
                try {
                    const rootTreeFolder = await TmsTreeBuilder.buildRootFolder(workspace, config, TmsTreeBuilder.buildSubTree(config, workspace));
                    this.rootTree.push(rootTreeFolder);
                    return rootTreeFolder;
                } catch (err) {
                    ErrorHandler.handleError(err);
                }
                return null as unknown as TmsTreeItem;
            });
        const arr = await Promise.all(promises);
        return arr.filter(e => e !== null);
    }
}