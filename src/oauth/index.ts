import * as vscode from 'vscode';
import { Constants } from '../constants';
import { AUTH_TYPE, SCOPES } from './constants';
import { CrowdinAuthenticationProvider } from './provider';
import { clearProject, selectProject } from './selectProject';

export function initialize(context: vscode.ExtensionContext, onProjectSelected: () => Promise<void>) {
    const subscriptions = context.subscriptions;

    const provider = new CrowdinAuthenticationProvider(context);

    subscriptions.push(
        vscode.commands.registerCommand(Constants.SIGN_IN_COMMAND, async () => {
            await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: true });
            await vscode.commands.executeCommand('setContext', 'crowdinAuthenticated', true);
        })
    );

    subscriptions.push(
        vscode.commands.registerCommand(Constants.SIGN_OUT_COMMAND, async () => {
            const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });
            if (!session) {
                vscode.window.showWarningMessage('You are not logged in');
                return;
            }
            await provider.removeSession(session.id);
            await clearProject();
            await vscode.commands.executeCommand('setContext', 'crowdinAuthenticated', false);
            vscode.window.showInformationMessage('You successfully logged out');
        })
    );

    subscriptions.push(provider);

    getSession();

    subscriptions.push(vscode.authentication.onDidChangeSessions(async (e) => getSession()));

    subscriptions.push(
        vscode.commands.registerCommand(Constants.SELECT_PROJECT_COMMAND, async () => {
            await selectProject();
            await onProjectSelected();
        })
    );
}

const getSession = async () => {
    const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });
    if (session) {
        await vscode.commands.executeCommand('setContext', 'crowdinAuthenticated', true);
        vscode.window.showInformationMessage(`Welcome back ${session.account.label}`);
    } else {
        await vscode.commands.executeCommand('setContext', 'crowdinAuthenticated', false);
    }
};
