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

    update(download: boolean = false, folder?: TmsTreeItem): void {
        if (!download) {
            this._onDidChangeTreeData.fire();
            return;
        }
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Downloading translations...`
            },
            () => {
                let promises: Promise<void>[];
                if (!!folder) {
                    promises = [folder.update().catch(e => ErrorHandler.handleError(e))];
                } else {
                    promises = this.rootTree.map(rootFolder => rootFolder.update().catch(e => ErrorHandler.handleError(e)));
                }
                return Promise.all(promises).finally(() => this._onDidChangeTreeData.fire());
            }
        );
    }

    save(item?: TmsTreeItem): Promise<any> {
        if (!!item) {
            return item.save(true).catch(e => ErrorHandler.handleError(e));
        }
        const thenable = vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Uploading all files...`
            },
            () => {
                const promises = this.rootTree.map(e => e.save().catch(e => ErrorHandler.handleError(e)));
                return Promise.all(promises);
            }
        );
        return CommonUtil.toPromise(thenable);
    }

    updateSource(item?: TmsTreeItem): Promise<any> {
        if (!!item) {
            return item.updateSource(true).catch(e => ErrorHandler.handleError(e));
        }
        const thenable = vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Updating source files...`
            },
            () => {
                const promises = this.rootTree.map(e => e.updateSource().catch(e => ErrorHandler.handleError(e)));
                return Promise.all(promises);
            }
        );
        return CommonUtil.toPromise(thenable);
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