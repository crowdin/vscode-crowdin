import * as vscode from 'vscode';
import { Constants } from '../constants';
import { AUTH_TYPE, SCOPES } from './constants';
import { CrowdinAuthenticationProvider } from './provider';
import { clearProject, getProject, selectProject } from './selectProject';

export function initialize(context: vscode.ExtensionContext) {
    const subscriptions = context.subscriptions;

    const provider = new CrowdinAuthenticationProvider(context);

    subscriptions.push(
        vscode.commands.registerCommand(
            Constants.SIGN_IN_COMMAND,
            async () => await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: true })
        )
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
            vscode.window.showInformationMessage('You successfully logged out');
        })
    );

    subscriptions.push(provider);

    getSession();

    subscriptions.push(vscode.authentication.onDidChangeSessions(async (e) => getSession()));

    subscriptions.push(vscode.commands.registerCommand(Constants.SELECT_PROJECT_COMMAND, () => selectProject()));

    //for testing
    subscriptions.push(
        vscode.commands.registerCommand('crowdin.test', async () => {
            const project = await getProject();
            if (!project) {
                vscode.window.showInformationMessage('Project not selected');
            } else {
                vscode.window.showInformationMessage(`Project selected : ${project}`);
            }
        })
    );
}

const getSession = async () => {
    const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });
    if (session) {
        vscode.window.showInformationMessage(`Welcome back ${session.account.label}`);
    }
};
