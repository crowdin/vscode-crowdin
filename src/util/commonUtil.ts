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

    static async getWorkspace(selectWorkspace = true): Promise<vscode.WorkspaceFolder | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length > 1 && selectWorkspace) {
            const workspace = await vscode.window.showQuickPick(
                workspaceFolders.map(
                    (e) =>
                        ({
                            label: e.name,
                            detail: e.index.toString(),
                        } as vscode.QuickPickItem)
                ),
                {
                    canPickMany: false,
                    title: 'Please select a workspace',
                }
            );
            return workspaceFolders.find((e) => e.index === Number(workspace?.detail));
        }
        return workspaceFolders[0];
    }
}
