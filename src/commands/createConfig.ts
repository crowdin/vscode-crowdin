import * as vscode from 'vscode';
import { ConfigProvider } from '../config/configProvider';
import { Constants } from '../constants';
import { CommonUtil } from '../util/commonUtil';

export async function createConfig() {
    const workspace = await CommonUtil.getWorkspace();
    if (!workspace) {
        vscode.window.showWarningMessage('Project workspace is empty');
        return;
    }
    const configProvider = new ConfigProvider(workspace);
    const { file, isNew } = await configProvider.create();
    vscode.commands.executeCommand('setContext', 'crowdinConfigExists', true);
    vscode.commands.executeCommand(Constants.VSCODE_OPEN_FILE, vscode.Uri.file(file));
    if (isNew) {
        await Constants.CONFIG_HOLDER.load();
    }
}
