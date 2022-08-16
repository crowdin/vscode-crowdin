import * as vscode from 'vscode';

export class ErrorHandler {

    static handleError(e: any): void {
        let message;
        if (typeof e === 'string') {
            message = e;
        } else if (!!e.message) {
            message = e.message;
        } else {
            message = JSON.stringify(e);
        }
        vscode.window.showErrorMessage(`Crowdin: ${message}`);
    }
}
