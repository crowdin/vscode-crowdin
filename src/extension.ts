import * as vscode from 'vscode';
import { Constants } from './constants';
import { StringsAutocompleteProvider } from './plugin/autocomplete/stringsAutocompleteProvider';
import { CrowdinConfigHolder } from './plugin/crowdinConfigHolder';
import { FilesProvider } from './plugin/files/filesProvider';
import { FilesTreeItem } from './plugin/files/filesTreeItem';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';

export function activate(context: vscode.ExtensionContext) {
    Constants.initialize(context);

    const configHolder = new CrowdinConfigHolder();
    const filesProvider = new FilesProvider(configHolder);
    const progressProvider = new ProgressTreeProvider(configHolder);
    configHolder.addListener(() => filesProvider.refresh());
    configHolder.addListener(() => progressProvider.refresh());
    configHolder.load();

    vscode.window.registerTreeDataProvider(Constants.FILES, filesProvider);
    vscode.window.registerTreeDataProvider(Constants.PROGRESS, progressProvider);

    vscode.commands.registerCommand(Constants.OPEN_FILE_COMMAND, (fsPath) =>
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(fsPath))
    );

    vscode.commands.registerCommand(Constants.REFRESH_PROGRESS_COMMAND, () => progressProvider.refresh());
    vscode.commands.registerCommand(Constants.REFRESH_COMMAND, () => {
        configHolder.reloadStrings();
        filesProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.DOWNLOAD_ALL_COMMAND, () => filesProvider.download());
    vscode.commands.registerCommand(Constants.SAVE_ALL_COMMAND, async () => {
        await filesProvider.save();
        progressProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.SAVE_FOLDER_COMMAND, async (item: FilesTreeItem) => {
        await filesProvider.save(item);
        progressProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.SAVE_FILE_COMMAND, async (item: FilesTreeItem) => {
        await filesProvider.save(item);
        progressProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.UPDATE_SOURCE_FOLDER_COMMAND, async (item?: FilesTreeItem) => {
        await filesProvider.updateSourceFolder(item);
        filesProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.UPDATE_SOURCE_FILE_COMMAND, (item: FilesTreeItem) =>
        filesProvider.updateSourceFile(item)
    );
    vscode.commands.registerCommand(Constants.DOWNLOAD_COMMAND, (item: FilesTreeItem) => filesProvider.download(item));
    vscode.commands.registerCommand(Constants.EDIT_COMMAND, (item: FilesTreeItem) =>
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.config.configPath))
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
                configHolder.load();
            }
        })
    );

    vscode.languages.registerCompletionItemProvider({ pattern: '**' }, new StringsAutocompleteProvider(configHolder));
}
