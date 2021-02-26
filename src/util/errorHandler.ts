import * as vscode from 'vscode';

export class ErrorHandler {

    static handleError(e: any): void {
        if (typeof e === 'string') {
            vscode.window.showErrorMessage(e);
        } else if (!!e.message) {
            vscode.window.showErrorMessage(e.message);
        } else {
            vscode.window.showErrorMessage(`Got an error from server ${JSON.stringify(e)}`);
        }
    }
}
