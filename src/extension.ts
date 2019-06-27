import * as vscode from 'vscode';
import { TmsProvider } from './plugin/tmsProvider';
import { TmsTreeItem } from './plugin/tmsTreeItem';
import { Constants } from './constants';

export function activate(context: vscode.ExtensionContext) {
	const tmsProvider = new TmsProvider();

	vscode.window.registerTreeDataProvider('tmsFiles', tmsProvider);

	vscode.commands.registerCommand(Constants.OPEN_TMS_FILE_COMMAND, fsPath => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fsPath)));
	vscode.commands.registerCommand('tmsFiles.refresh', () => tmsProvider.update());
	vscode.commands.registerCommand('tmsFiles.downloadAll', () => tmsProvider.update(true));
	vscode.commands.registerCommand('tmsFiles.saveAll', () => tmsProvider.save());
	vscode.commands.registerCommand('tmsFiles.save', (item: TmsTreeItem) => tmsProvider.save(item));
	vscode.commands.registerCommand('tmsFiles.download', (item: TmsTreeItem) => tmsProvider.update(true, item));
	vscode.commands.registerCommand('tmsFiles.edit', (item: TmsTreeItem) => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.config.configPath)));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
			tmsProvider.update();
		}
	}));
}
