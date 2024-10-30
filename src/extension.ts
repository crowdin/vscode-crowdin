import * as vscode from 'vscode';
import { createConfig } from './commands/createConfig';
import { extractString } from './commands/extractString';
import { openConfig } from './commands/openConfig';
import { ConfigProvider } from './config/configProvider';
import { Constants } from './constants';
import * as OAuth from './oauth';
import { StringsAutocompleteProvider } from './plugin/autocomplete/stringsAutocompleteProvider';
import { ProgressTreeProvider } from './plugin/progress/progressTreeProvider';
import { BundlesTreeItem } from './plugin/tree/bundles/bundlesTreeItem';
import { FilesTreeItem } from './plugin/tree/files/filesTreeItem';
import { TreeProvider } from './plugin/tree/treeProvider';
import { CommonUtil } from './util/commonUtil';

export function activate(context: vscode.ExtensionContext) {
    Constants.initialize(context);

    const uploadTreeProvider = new TreeProvider(Constants.CONFIG_HOLDER, false);
    const downloadTreeProvider = new TreeProvider(Constants.CONFIG_HOLDER, true);
    const progressProvider = new ProgressTreeProvider(Constants.CONFIG_HOLDER);

    Constants.CONFIG_HOLDER.addListener(() => uploadTreeProvider.refresh());
    Constants.CONFIG_HOLDER.addListener(() => downloadTreeProvider.refresh());
    Constants.CONFIG_HOLDER.addListener(() => progressProvider.refresh());
    Constants.CONFIG_HOLDER.addListener(setConfigExists);
    Constants.CONFIG_HOLDER.initialize();

    OAuth.initialize(context, () => Constants.CONFIG_HOLDER.reload());

    setConfigExists();

    vscode.window.registerTreeDataProvider(Constants.UPLOAD, uploadTreeProvider);
    vscode.window.registerTreeDataProvider(Constants.DOWNLOAD, downloadTreeProvider);
    vscode.window.registerTreeDataProvider(Constants.PROGRESS, progressProvider);

    vscode.commands.registerCommand(Constants.CREATE_CONFIG_COMMAND, () => createConfig());

    vscode.commands.registerCommand(Constants.OPEN_CONFIG_COMMAND, () => openConfig());

    vscode.commands.registerCommand(Constants.OPEN_FILE_COMMAND, (fsPath) =>
        vscode.commands.executeCommand(Constants.VSCODE_OPEN_FILE, vscode.Uri.file(fsPath))
    );

    vscode.commands.registerCommand(Constants.REFRESH_PROGRESS_COMMAND, () => progressProvider.refresh());
    vscode.commands.registerCommand(Constants.REFRESH_DOWNLOAD_COMMAND, () => downloadTreeProvider.refresh());
    vscode.commands.registerCommand(Constants.REFRESH_UPLOAD_COMMAND, () => {
        Constants.CONFIG_HOLDER.reloadStrings();
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

    vscode.commands.registerCommand(Constants.DOWNLOAD_BUNDLE_COMMAND, (item: BundlesTreeItem) =>
        downloadTreeProvider.downloadBundle(item)
    );
    vscode.commands.registerCommand(Constants.ADD_BUNDLE_COMMAND, openBundleSettingsUrl);
    vscode.commands.registerCommand(Constants.SETTINGS_BUNDLE_COMMAND, openBundleSettingsUrl);

    vscode.commands.registerCommand(Constants.EDIT_COMMAND, (item: FilesTreeItem) =>
        vscode.commands.executeCommand(Constants.VSCODE_OPEN_FILE, vscode.Uri.file(item.config.configPath))
    );

    vscode.commands.registerCommand(Constants.STRING_EXTRACT_COMMAND, () => extractString());

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(Constants.AUTO_REFRESH_PROPERTY)) {
                Constants.CONFIG_HOLDER.load();
            }
        })
    );

    vscode.languages.registerCompletionItemProvider({ pattern: '**' }, new StringsAutocompleteProvider());
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

function openBundleSettingsUrl(item: BundlesTreeItem) {
    let url;
    if (!item.bundle) {
        url = item.config.organization
            ? `https://${item.config.organization}.crowdin.com/u/projects/${item.project.id}/download`
            : `https://crowdin.com/project/${item.project.identifier}/download#bundles`;
    } else {
        url = item.config.organization
            ? `https://${item.config.organization}.crowdin.com/u/projects/${item.project.id}/translations/bundle/${item.bundle.id}`
            : `https://crowdin.com/project/${item.project.identifier}/download#bundles:${item.bundle.id}`;
    }
    vscode.env.openExternal(vscode.Uri.parse(url));
}
