import * as vscode from 'vscode';
import { TmsProvider } from './plugin/tmsProvider';
import { TmsTreeItem } from './plugin/tmsTreeItem';
import { Constants } from './constants';

export function activate(context: vscode.ExtensionContext) {
	const tmsProvider = new TmsProvider();

	vscode.window.registerTreeDataProvider('tmsFiles', tmsProvider);

	vscode.commands.registerCommand(Constants.OPEN_TMS_FILE_COMMAND, fsPath => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fsPath)));
	vscode.commands.registerCommand('tmsFiles.refresh', () => tmsProvider.update());
	vscode.commands.registerCommand('tmsFiles.download', () => tmsProvider.update(true));
	vscode.commands.registerCommand('tmsFiles.saveAll', () => tmsProvider.save());
	vscode.commands.registerCommand('tmsFiles.save', (item: TmsTreeItem) => item.save(true));
}
