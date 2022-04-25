import { join } from 'path';
import * as vscode from 'vscode';

export class TranslationsEditor {
    public static readonly viewType = 'crowdin.translationsEditor';

    panel: vscode.WebviewPanel;

    constructor(private extensionPath: string) {
        this.panel = vscode.window.createWebviewPanel(
            TranslationsEditor.viewType,
            'Translations Editor',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(join(extensionPath, 'media'))],
            }
        );
        this.update();
    }

    private update() {
        this.panel.webview.html = this.getHtmlForWebview();
    }

    private getHtmlForWebview() {
        const nonce = this.getNonce();
        let rows = '';
        for (let i = 0; i < 100; i++) {
            rows += `
                <tr>
                    <td class="text">account_name</td>
                    <td class="text">app/src/main/res</td>
                    <td class="text" style="text-align: center"><input type="checkbox"></td>
                    <td class="text">My Application Demo</td>
                    <td class="text">My Application Demo</td>
                    <td class="text">My Application Demo</td>
                    <td class="text">My Application Demo</td>
                    <td class="text">My Application Demo</td>
                    <td class="text">My Application Demo</td>
                    <td class="text">My Application Demo</td>
                </tr>
            `;
        }
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.standardiseCspSource(this.panel.webview.cspSource)} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" type="text/css" href="${this.getMediaUri('vscode.css')}">
            <link rel="stylesheet" type="text/css" href="${this.getMediaUri('reset.css')}">
            <link rel="stylesheet" type="text/css" href="${this.getMediaUri('main.css')}">
            <title>Translations Editor</title>
        </head>
        <body>
            <div>
                <table>
                    <tbody>
                    <tr>
                        <th>Key</th>
                        <th>Resource Folder</th>
                        <th>Untranslatable</th>
                        <th>Default Value</th>
                        <th>Ukrainian</th>
                        <th>Ukrainian</th>
                        <th>Ukrainian</th>
                        <th>Ukrainian</th>
                        <th>Ukrainian</th>
                        <th>Ukrainian</th>
                    </tr>
                    ${rows}
                    </tbody>
                </table>
            </div>
            <script nonce="${nonce}" src="${this.getMediaUri('main.js')}"></script>
        </body>
        </html>`;
    }

    private getMediaUri(file: string) {
        return this.panel.webview.asWebviewUri(this.getUri('media', file));
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private getUri(...pathComps: string[]) {
        return vscode.Uri.file(join(this.extensionPath, ...pathComps));
    }

    private standardiseCspSource(cspSource: string) {
        if (cspSource.startsWith('http://') || cspSource.startsWith('https://')) {
            const pathIndex = cspSource.indexOf('/', 8), queryIndex = cspSource.indexOf('?', 8), fragmentIndex = cspSource.indexOf('#', 8);
            let endOfAuthorityIndex = pathIndex;
            if (queryIndex > -1 && (queryIndex < endOfAuthorityIndex || endOfAuthorityIndex === -1)) endOfAuthorityIndex = queryIndex;
            if (fragmentIndex > -1 && (fragmentIndex < endOfAuthorityIndex || endOfAuthorityIndex === -1)) endOfAuthorityIndex = fragmentIndex;
            return endOfAuthorityIndex > -1 ? cspSource.substring(0, endOfAuthorityIndex) : cspSource;
        } else {
            return cspSource;
        }
    }
}