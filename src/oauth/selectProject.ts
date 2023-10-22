import * as vscode from 'vscode';
import { Constants } from '../constants';
import { CommonUtil } from '../util/commonUtil';
import { getClient } from './crowdin';

const KEY = 'crowdin.project';

export async function selectProject() {
    const client = await getClient();

    if (!client) {
        vscode.window.showErrorMessage('Please sign in to Crowdin');
        return;
    }

    const projects = await CommonUtil.withProgress(
        () => client.projectsGroupsApi.withFetchAll().listProjects(),
        'Loading projects...'
    );

    const project = await vscode.window.showQuickPick(
        projects.data.map((e) => `${e.data.name} | ${e.data.id}`),
        {
            canPickMany: false,
            title: 'Please select a project',
        }
    );

    if (!project) {
        vscode.window.showErrorMessage('Please select a project');
        throw new Error('Project missing');
    }

    const projectId = project.split(' | ').pop();

    if (!projectId) {
        vscode.window.showErrorMessage('Please select a valid project');
        return;
    }

    await Constants.EXTENSION_CONTEXT.secrets.store(KEY, projectId);

    vscode.window.showInformationMessage(`Project ${project} selected`);
}

export async function getProject() {
    const projectId = await Constants.EXTENSION_CONTEXT.secrets.get(KEY);
    if (projectId) {
        return Number(projectId);
    }
}

export async function clearProject() {
    await Constants.EXTENSION_CONTEXT.secrets.delete(KEY);
}
