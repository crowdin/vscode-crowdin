import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigModel } from '../config/ConfigModel';

export class TmsTreeItem extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public childs: Promise<TmsTreeItem[]>,
        public relativePath: string,
        public readonly command?: vscode.Command,
        public filePath?: string,
        public translation?: string,
        public config?: ConfigModel
    ) {
        super(label, collapsibleState);
    }

    iconPath = {
        light: path.join(__filename, '..', '..', '..', 'resources', 'light', this.iconFile),
        dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', this.iconFile)
    };

    contextValue = 'tmsItem';

    get iconFile(): string {
        return this.collapsibleState === vscode.TreeItemCollapsibleState.None
            ? 'document.svg'
            : 'folder.svg';
    }

    async save(progress: boolean = false): Promise<void> {
        const arr = await this.childs;
        if (progress) {
            let title = `Saving files in ${this.relativePath}`;
            if (arr.length === 0 && !this.filePath) {
                title = `Saving file ${this.relativePath}`;
            }
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: title
                },
                async (progress, token) => {
                    return this._save(arr);
                }
            );
        } else {
            return this._save(arr);
        }
    }

    private async _save(arr: TmsTreeItem[]): Promise<void> {
        if (arr.length === 0) {
            //TODO implement saving
            return new Promise<void>(resolve => {
                setTimeout(() => {
                    console.log(`saved ${this.relativePath}`);
                    resolve();
                }, 1000);
            });
        } else {
            for (const item of arr) {
                await item.save();
            }
        }
    }
}