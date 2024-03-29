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

    const workspace = await CommonUtil.getWorkspace();

    if (!workspace) {
        return;
    }

    const projects = await CommonUtil.withProgress(
        () => client.projectsGroupsApi.withFetchAll().listProjects({ hasManagerAccess: 1 }),
        'Loading projects...'
    );

    const project = await vscode.window.showQuickPick(
        projects.data.map(
            (e) =>
                ({
                    label: e.data.name,
                    description: e.data.description,
                    detail: e.data.id.toString(),
                } as vscode.QuickPickItem)
        ),
        {
            canPickMany: false,
            title: 'Please select a project',
        }
    );

    if (!project) {
        vscode.window.showErrorMessage('Please select a project');
        throw new Error('Project missing');
    }

    const projectId = project.detail;

    if (!projectId) {
        vscode.window.showErrorMessage('Please select a valid project');
        return;
    }

    await Constants.EXTENSION_CONTEXT.secrets.store(`${KEY}_${workspace.name}`, projectId);

    vscode.window.showInformationMessage(`Project ${project.label} selected`);
}

export async function getProject(workspace: vscode.WorkspaceFolder) {
    const projectId = await Constants.EXTENSION_CONTEXT.secrets.get(`${KEY}_${workspace.name}`);
    if (projectId) {
        return Number(projectId);
    }
}

export async function clearProjects() {
    const promises = (vscode.workspace.workspaceFolders || []).map((workspace) =>
        Constants.EXTENSION_CONTEXT.secrets.delete(`${KEY}_${workspace.name}`)
    );
    await Promise.all(promises);
}
