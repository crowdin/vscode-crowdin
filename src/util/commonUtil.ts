import * as vscode from 'vscode';

export class CommonUtil {
    static withProgress<R>(
        task: () => Promise<R>,
        title: string,
        location: vscode.ProgressLocation = vscode.ProgressLocation.Notification
    ): Promise<R> {
        const thenable = vscode.window.withProgress({ location, title }, task);
        return new Promise((res, rej) => {
            thenable.then(
                (v) => res(v),
                (e) => rej(e)
            );
        });
    }

    static getWorkspace(): vscode.WorkspaceFolder | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        return workspaceFolders[0];
    }
}
