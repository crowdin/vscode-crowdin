import * as vscode from 'vscode';
import { Constants } from './constants';
import { ConfigurationListener, CrowdinConfigHolder } from './plugin/crowdinConfigHolder';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';
import { TmsProvider } from './plugin/tms/tmsProvider';
import { TmsTreeItem } from './plugin/tms/tmsTreeItem';

export function activate(context: vscode.ExtensionContext) {
	Constants.initialize(context);

	const configHolder = new CrowdinConfigHolder();
	const tmsProvider = new TmsProvider(configHolder);
	const progressProvider = new ProgressTreeProvider(configHolder);
	const listener: ConfigurationListener = {
		configsUpdate: () => {
			tmsProvider.update();
			progressProvider.refresh();
		}
	}
	configHolder.addListener(listener);
	configHolder.load();

	vscode.window.registerTreeDataProvider('tmsFiles', tmsProvider);
	vscode.window.registerTreeDataProvider('translationProgress', progressProvider);

	vscode.commands.registerCommand(Constants.OPEN_TMS_FILE_COMMAND, fsPath => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fsPath)));

	vscode.commands.registerCommand('translationProgress.refresh', () => progressProvider.refresh());
	vscode.commands.registerCommand('tmsFiles.refresh', () => tmsProvider.update());
	vscode.commands.registerCommand('tmsFiles.downloadAll', () => tmsProvider.update(true));
	vscode.commands.registerCommand('tmsFiles.saveAll', async () => {
		await tmsProvider.save();
		progressProvider.refresh();
	});
	vscode.commands.registerCommand('tmsFiles.save', async (item: TmsTreeItem) => {
		await tmsProvider.save(item);
		progressProvider.refresh();
	});
	vscode.commands.registerCommand('tmsFiles.download', (item: TmsTreeItem) => tmsProvider.update(true, item));
	vscode.commands.registerCommand('tmsFiles.edit', (item: TmsTreeItem) => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.config.configPath)));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
			configHolder.load();
		}
	}));
}
