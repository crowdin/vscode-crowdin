import * as vscode from 'vscode';
import { Constants } from '../constants';

export class ErrorHandler {
    static handleError(e: any): void {
        if (!Constants.APPLICATION_OPENED) {
            return;
        }
        const message = ErrorHandler.getMessage(e);
        vscode.window.showErrorMessage(`Crowdin: ${message}`);
    }

    static getMessage(e: any): string {
        let message;
        if (typeof e === 'string') {
            message = e;
        } else if (!!e.message) {
            message = e.message;
        } else {
            message = JSON.stringify(e);
        }
        return message;
    }
}
