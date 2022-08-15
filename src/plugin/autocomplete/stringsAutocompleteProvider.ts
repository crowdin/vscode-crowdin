import * as vscode from 'vscode';
import { Constants } from '../../constants';
import { CrowdinConfigHolder } from '../crowdinConfigHolder';

export class StringsAutocompleteProvider implements vscode.CompletionItemProvider {

    constructor(readonly configHolder: CrowdinConfigHolder) {
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const enabled = vscode.workspace.getConfiguration().get<boolean>(Constants.STRINGS_COMPLETION_PROPERTY);
        const fileExtensions = vscode.workspace.getConfiguration().get<string>(Constants.STRINGS_COMPLETION_FILES_FILTER_PROPERTY);
        if (!enabled) {
            return [];
        }

        if (fileExtensions && fileExtensions !== '*') {
            const extensions = fileExtensions.split(',');
            const extension = document.uri.path.split('.').pop();
            if (extensions.every(e => e !== extension)) {
                return [];
            }
        }

        const workspace = vscode.workspace.workspaceFolders?.find(workspace => document.uri.path.includes(workspace.uri.path));

        if (!workspace) {
            return [];
        }

        const strings = this.configHolder.getCrowdinStrings(workspace);

        if (!strings || strings.length === 0) {
            return [];
        }

        return strings
            .filter(str => !!str.identifier)
            .map(str => {
                const snippetCompletion = new vscode.CompletionItem(str.identifier);
                snippetCompletion.detail = str.text as string;
                snippetCompletion.kind = vscode.CompletionItemKind.Text;
                snippetCompletion.documentation = `Context:\n ${str.context}`;
                return snippetCompletion;
            });
    }

}