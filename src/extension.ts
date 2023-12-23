import * as vscode from 'vscode';
import { ConfigProvider } from './config/configProvider';
import { Constants } from './constants';
import * as OAuth from './oauth';
import { StringsAutocompleteProvider } from './plugin/autocomplete/stringsAutocompleteProvider';
import { CrowdinConfigHolder } from './plugin/crowdinConfigHolder';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';
import { FilesTreeItem } from './plugin/tree/files/filesTreeItem';
import { TreeProvider } from './plugin/tree/treeProvider';
import { CommonUtil } from './util/commonUtil';

export function activate(context: vscode.ExtensionContext) {
    Constants.initialize(context);

    const configHolder = new CrowdinConfigHolder();
    const uploadTreeProvider = new TreeProvider(configHolder, false);
    const downloadTreeProvider = new TreeProvider(configHolder, true);
    const progressProvider = new ProgressTreeProvider(configHolder);

    configHolder.addListener(() => uploadTreeProvider.refresh());
    configHolder.addListener(() => downloadTreeProvider.refresh());
    configHolder.addListener(() => progressProvider.refresh());
    configHolder.addListener(setConfigExists);
    configHolder.initialize();

    OAuth.initialize(context, () => configHolder.reload());

    setConfigExists();

    vscode.window.registerTreeDataProvider(Constants.UPLOAD, uploadTreeProvider);
    vscode.window.registerTreeDataProvider(Constants.DOWNLOAD, downloadTreeProvider);
    vscode.window.registerTreeDataProvider(Constants.PROGRESS, progressProvider);

    vscode.commands.registerCommand(Constants.CREATE_CONFIG_COMMAND, async () => {
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
            await configHolder.load();
        }
    });

    vscode.commands.registerCommand(Constants.OPEN_CONFIG_COMMAND, async () => {
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
    });

    vscode.commands.registerCommand(Constants.OPEN_FILE_COMMAND, (fsPath) =>
        vscode.commands.executeCommand(Constants.VSCODE_OPEN_FILE, vscode.Uri.file(fsPath))
    );

    vscode.commands.registerCommand(Constants.REFRESH_PROGRESS_COMMAND, () => progressProvider.refresh());
    vscode.commands.registerCommand(Constants.REFRESH_DOWNLOAD_COMMAND, () => downloadTreeProvider.refresh());
    vscode.commands.registerCommand(Constants.REFRESH_UPLOAD_COMMAND, () => {
        configHolder.reloadStrings();
        uploadTreeProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.SAVE_ALL_COMMAND, async () => {
        await uploadTreeProvider.save();
        progressProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.SAVE_FOLDER_COMMAND, async (item: FilesTreeItem) => {
        await uploadTreeProvider.save(item);
        progressProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.SAVE_FILE_COMMAND, async (item: FilesTreeItem) => {
        await uploadTreeProvider.save(item);
        progressProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.UPDATE_SOURCE_FOLDER_COMMAND, async (item: FilesTreeItem) => {
        await downloadTreeProvider.updateSourceFolder(item);
        downloadTreeProvider.refresh();
    });
    vscode.commands.registerCommand(Constants.UPDATE_SOURCE_FILE_COMMAND, (item: FilesTreeItem) =>
        downloadTreeProvider.updateSourceFile(item)
    );
    vscode.commands.registerCommand(Constants.DOWNLOAD_COMMAND, (item: FilesTreeItem) =>
        downloadTreeProvider.download(item)
    );
    vscode.commands.registerCommand(Constants.EDIT_COMMAND, (item: FilesTreeItem) =>
        vscode.commands.executeCommand(Constants.VSCODE_OPEN_FILE, vscode.Uri.file(item.config.configPath))
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

async function setConfigExists() {
    const workspace = await CommonUtil.getWorkspace(false);
    if (workspace) {
        new ConfigProvider(workspace).getFile().then((file) => {
            if (file) {
                vscode.commands.executeCommand('setContext', 'crowdinConfigExists', true);
            } else {
                vscode.commands.executeCommand('setContext', 'crowdinConfigExists', false);
            }
        });
    }
}
