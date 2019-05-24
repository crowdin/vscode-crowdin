import * as vscode from 'vscode';
import * as path from 'path';

export class TmsTreeItem extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
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

    save(): void {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Saving ${this.label}...`
            },
            (progress, token) => {
                //TODO implement saving
                var p = new Promise(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                });
                return p;
            }
        );
    }
}