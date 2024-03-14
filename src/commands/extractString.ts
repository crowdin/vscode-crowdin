import { ProjectsGroupsModel, SourceFilesModel } from '@crowdin/crowdin-api-client';
import * as vscode from 'vscode';
import { buildClient } from '../config/configModel';
import { Constants } from '../constants';
import { CommonUtil } from '../util/commonUtil';
import { ErrorHandler } from '../util/errorHandler';

const editableFileTypes = [
    'csv',
    'resx',
    'json',
    'i18next_json',
    'android',
    'macosx',
    'strings',
    'properties',
    'xliff',
    'arb',
    'gettext',
    'yaml',
    'xlsx',
];

export async function extractString() {
    CommonUtil.withProgress(async () => {
        try {
            await addString();
        } catch (err) {
            const message = ErrorHandler.getMessage(err);
            vscode.window.showErrorMessage(`Crowdin: ${message}`);
        }
    }, 'Extracting string...');
}

async function addString() {
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;
    if (!selection || selection.isEmpty) {
        return;
    }

    const selectionRange = new vscode.Range(
        selection.start.line,
        selection.start.character,
        selection.end.line,
        selection.end.character
    );
    const text = editor.document.getText(selectionRange).trim();

    if (!text.length) {
        return;
    }

    const currentWorkspace = await CommonUtil.getWorkspace();
    if (!currentWorkspace) {
        vscode.window.showWarningMessage('Project workspace is empty');
        return;
    }

    const config = (await Constants.CONFIG_HOLDER.configurations()).find(
        ([, workspace]) => workspace === currentWorkspace
    );

    if (!config) {
        vscode.window.showWarningMessage('Project configuration file is missing');
        return;
    }

    const isStringsBased = config[0].project.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    const client = buildClient(currentWorkspace.uri, config[0].config, isStringsBased);

    const identifier = await vscode.window.showInputBox({ title: 'Please enter a string identifier' });

    if (!identifier?.trim()?.length) {
        vscode.window.showErrorMessage('Please enter string identifier');
        return;
    }

    let fileId;

    if (!isStringsBased) {
        const files = await client.listFiles();
        const allowedFiles = files.filter((f) => editableFileTypes.includes(f.type));

        const file = await vscode.window.showQuickPick(
            allowedFiles.map(
                (e) =>
                    ({
                        label: e.name,
                        description: e.path,
                        detail: e.id.toString(),
                    } as vscode.QuickPickItem)
            ),
            {
                canPickMany: false,
                title: 'Please select a file',
            }
        );

        if (!file) {
            vscode.window.showErrorMessage('Please select a file');
            return;
        }

        fileId = Number(file.detail);
    }

    await client.addString({
        fileId,
        id: identifier,
        text,
    });

    vscode.window.showInformationMessage('String successfully extracted to Crowdin');

    editor.edit((editBuilder) => editBuilder.replace(selectionRange, identifier));
}
