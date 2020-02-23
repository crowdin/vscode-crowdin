import * as vscode from 'vscode';

export class Constants {
    static EXTENSION_CONTEXT: vscode.ExtensionContext;
    static readonly OPEN_TMS_FILE_COMMAND = 'extension.openTmsFile';
    static readonly AUTO_REFRESH_PROPERTY = 'tms.autoRefresh';
    static readonly CROWDIN_PATH_SEPARATOR = '/';
    static readonly CROWDIN_API_MAX_CONCURRENT_REQUESTS = 15;
    static readonly CROWDIN_API_REQUESTS_INTERVAL_MS = 10;
    static readonly PLUGIN_VERSION = '0.0.3';
    static VSCODE_VERSION: string;

    static initialize(context: vscode.ExtensionContext) {
        Constants.VSCODE_VERSION = vscode.version;
        Constants.EXTENSION_CONTEXT = context;
    }
}