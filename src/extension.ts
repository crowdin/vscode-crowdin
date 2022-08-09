import * as vscode from 'vscode';
import { Constants } from './constants';
import { CrowdinConfigHolder } from './plugin/crowdinConfigHolder';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';
import { TmsProvider } from './plugin/tms/tmsProvider';
import { TmsTreeItem } from './plugin/tms/tmsTreeItem';

export function activate(context: vscode.ExtensionContext) {
	Constants.initialize(context);

	const configHolder = new CrowdinConfigHolder();
	const tmsProvider = new TmsProvider(configHolder);
	const progressProvider = new ProgressTreeProvider(configHolder);
	configHolder.addListener(() => tmsProvider.refresh());
	configHolder.addListener(() => progressProvider.refresh());
	configHolder.load();

	vscode.window.registerTreeDataProvider('tmsFiles', tmsProvider);
	vscode.window.registerTreeDataProvider('translationProgress', progressProvider);

	vscode.commands.registerCommand(Constants.OPEN_TMS_FILE_COMMAND, fsPath => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fsPath)));

	vscode.commands.registerCommand('translationProgress.refresh', () => progressProvider.refresh());
	vscode.commands.registerCommand('tmsFiles.refresh', () => tmsProvider.refresh());
	vscode.commands.registerCommand('tmsFiles.downloadAll', () => tmsProvider.download());
	vscode.commands.registerCommand('tmsFiles.saveAll', async () => {
		await tmsProvider.save();
		progressProvider.refresh();
	});
	vscode.commands.registerCommand('tmsFiles.save', async (item: TmsTreeItem) => {
		await tmsProvider.save(item);
		progressProvider.refresh();
	});
	vscode.commands.registerCommand('tmsFiles.updateSourceFolder', async (item?: TmsTreeItem) => {
		await tmsProvider.updateSourceFolder(item);
		tmsProvider.refresh();
	});
	vscode.commands.registerCommand('tmsFiles.updateSourceFile', (item: TmsTreeItem) => tmsProvider.updateSourceFile(item));
	vscode.commands.registerCommand('tmsFiles.download', (item: TmsTreeItem) => tmsProvider.download(item));
	vscode.commands.registerCommand('tmsFiles.edit', (item: TmsTreeItem) => vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.config.configPath)));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
			configHolder.load();
		}
	}));

	vscode.languages.registerCompletionItemProvider({ pattern: '**' }, {
		provideCompletionItems(document, position, token, context) {
			const enabled = vscode.workspace.getConfiguration().get<boolean>(Constants.STRINGS_COMPLETION_PROPERTY);
			if (!enabled) {
				return [];
			}
			// a simple completion item which inserts `Hello World!`
			const simpleCompletion = new vscode.CompletionItem('Hello World!');

			// a completion item that inserts its text as snippet,
			// the `insertText`-property is a `SnippetString` which we will
			// honored by the editor.
			const snippetCompletion = new vscode.CompletionItem('Good part of the day');
			snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
			snippetCompletion.documentation = new vscode.MarkdownString("Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.");

			// a completion item that can be accepted by a commit character,
			// the `commitCharacters`-property is set which means that the completion will
			// be inserted and then the character will be typed.
			const commitCharacterCompletion = new vscode.CompletionItem('console');
			commitCharacterCompletion.commitCharacters = ['.'];
			commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');

			// a completion item that retriggers IntelliSense when being accepted,
			// the `command`-property is set which the editor will execute after 
			// completion has been inserted. Also, the `insertText` is set so that 
			// a space is inserted after `new`
			const commandCompletion = new vscode.CompletionItem('new');
			commandCompletion.kind = vscode.CompletionItemKind.Keyword;
			commandCompletion.insertText = 'new ';
			commandCompletion.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };

			// return all completion items as array
			return [
				simpleCompletion,
				snippetCompletion,
				commitCharacterCompletion,
				commandCompletion
			];
		},
	});
}
