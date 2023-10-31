import * as vscode from 'vscode';

export class Constants {
    static EXTENSION_CONTEXT: vscode.ExtensionContext;
    //tree providers
    static readonly FILES = 'files';
    static readonly PROGRESS = 'translationProgress';
    //commands
    static readonly VSCODE_OPEN_FILE = 'vscode.open';
    static readonly CREATE_CONFIG_COMMAND = 'config.create';
    static readonly OPEN_CONFIG_COMMAND = 'config.open';
    static readonly OPEN_FILE_COMMAND = 'extension.openFile';
    static readonly REFRESH_PROGRESS_COMMAND = 'translationProgress.refresh';
    static readonly DOWNLOAD_ALL_COMMAND = 'files.downloadAll';
    static readonly SAVE_ALL_COMMAND = 'files.saveAll';
    static readonly SAVE_FOLDER_COMMAND = 'files.saveFolder';
    static readonly SAVE_FILE_COMMAND = 'files.saveFile';
    static readonly DOWNLOAD_COMMAND = 'files.download';
    static readonly EDIT_COMMAND = 'files.edit';
    static readonly REFRESH_COMMAND = 'files.refresh';
    static readonly UPDATE_SOURCE_FOLDER_COMMAND = 'files.updateSourceFolder';
    static readonly UPDATE_SOURCE_FILE_COMMAND = 'files.updateSourceFile';
    static readonly SIGN_IN_COMMAND = 'crowdin.signIn';
    static readonly SIGN_OUT_COMMAND = 'crowdin.signOut';
    static readonly SELECT_PROJECT_COMMAND = 'crowdin.selectProject';
    //properties
    static readonly AUTO_REFRESH_PROPERTY = 'crowdin.autoRefresh';
    static readonly STRINGS_COMPLETION_PROPERTY = 'crowdin.stringsCompletion';
    static readonly STRINGS_COMPLETION_FILES_FILTER_PROPERTY = 'crowdin.stringsCompletionFileExtensions';
    static readonly USE_GIT_BRANCH_PROPERTY = 'crowdin.useGitBranch';
    //general
    static readonly CROWDIN_PATH_SEPARATOR = '/';
    static readonly PLUGIN_VERSION = '1.6.0';
    static readonly CLIENT_RETRIES = 5;
    static readonly CLIENT_RETRY_WAIT_INTERVAL_MS = 750;
    static VSCODE_VERSION: string;

    static initialize(context: vscode.ExtensionContext) {
        Constants.VSCODE_VERSION = vscode.version;
        Constants.EXTENSION_CONTEXT = context;
    }
}
