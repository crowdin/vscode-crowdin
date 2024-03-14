import * as vscode from 'vscode';
import { ConfigProvider } from '../config/configProvider';
import { Constants } from '../constants';
import { CommonUtil } from '../util/commonUtil';

export async function openConfig() {
    const workspace = await CommonUtil.getWorkspace();
    if (!workspace) {
        vscode.window.showWarningMessage('Project workspace is empty');
        return;
    }
    const configProvider = new ConfigProvider(workspace);
    const file = await configProvider.getFile();
    if (!file) {
        vscode.window.showWarningMessage(`Could not find configuration file in ${workspace.name}`);
        return;
    }
    vscode.commands.executeCommand(Constants.VSCODE_OPEN_FILE, vscode.Uri.file(file));
}
