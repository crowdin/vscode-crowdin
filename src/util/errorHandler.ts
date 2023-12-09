import * as vscode from 'vscode';
import { Constants } from '../constants';

export class ErrorHandler {
    static handleError(e: any): void {
        if (!Constants.APPLICATION_OPENED) {
            return;
        }
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
