import * as vscode from 'vscode';
import { TMSProvider, TMSTreeItem } from './ui/TMSProvider';

export function activate(context: vscode.ExtensionContext) {

	const tmsProvider = new TMSProvider(vscode.workspace.workspaceFolders);
	vscode.window.registerTreeDataProvider('tmsFiles', tmsProvider);
	vscode.commands.registerCommand('tmsFiles.refreshEntry', () => tmsProvider.refresh());
	vscode.commands.registerCommand('tmsFiles.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('tmsFiles.editEntry', (item: TMSTreeItem) => vscode.window.showInformationMessage(`Successfully called edit entry on ${item.label}.`));
	vscode.commands.registerCommand('tmsFiles.deleteEntry', (item: TMSTreeItem) => vscode.window.showInformationMessage(`Successfully called delete entry on ${item.label}.`));
}
