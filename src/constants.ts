import * as vscode from 'vscode';

export class Constants {
    static EXTENSION_CONTEXT: vscode.ExtensionContext;
    static readonly OPEN_TMS_FILE_COMMAND = 'extension.openTmsFile';
    static readonly AUTO_REFRESH_PROPERTY = 'tms.autoRefresh';
    static readonly CROWDIN_PATH_SEPARATOR = '/';
    static readonly PLUGIN_VERSION = '1.2.1';
    static readonly CLIENT_RETRIES = 5;
    static readonly CLIENT_RETRY_WAIT_INTERVAL_MS = 750;
    static VSCODE_VERSION: string;

    static initialize(context: vscode.ExtensionContext) {
        Constants.VSCODE_VERSION = vscode.version;
        Constants.EXTENSION_CONTEXT = context;
    }
}
