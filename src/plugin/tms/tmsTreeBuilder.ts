import * as glob from 'glob';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { ConfigModel } from '../../config/configModel';
import { FileModel } from '../../config/fileModel';
import { Constants } from '../../constants';
import { SourceFiles } from '../../model/sourceFiles';
import { TmsTreeItem } from './tmsTreeItem';
import { TmsTreeItemContextValue } from './tmsTreeItemContextValue';

const asyncGlob = util.promisify(glob);

export class TmsTreeBuilder {

    static async buildSubTree(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<TmsTreeItem[]> {
        let matrix = await this.buildFilesMatrix(config, workspace);
        let subtree: TmsTreeItem[] = [];
        let childs: Map<string, TmsTreeItem[]> = new Map();
        for (let i = matrix.length - 1; i >= 0; i--) {
            const map = matrix[i];
            let temp = new Map(childs);
            childs.clear();
            map.forEach(([parent, fullPath, isLeaf, file], label) => {
                let item;
                const labelToDisplay = label.split(path.sep)[label.split(path.sep).length - 1];
                if (isLeaf) {
                    item = TmsTreeBuilder.buildLeaf(workspace, labelToDisplay, fullPath, config, file);
                } else {
                    item = TmsTreeBuilder.buildFolder(workspace, labelToDisplay, (temp.get(label) || []).sort(TmsTreeBuilder.compare), config, fullPath);
                }
                if (!!parent) {
                    let childElements = childs.get(parent) || [];
                    childElements.push(item);
                    childs.set(parent, childElements);
                } else {
                    subtree.push(item);
                }
            });
        }
        return subtree.sort(TmsTreeBuilder.compare);
    }

    static async buildFilesMatrix(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<Array<Map<string, [string | undefined, string, boolean, FileModel]>>> {
        let matrix: Array<Map<string, [string | undefined, string, boolean, FileModel]>> = [];
        const root = !!config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
        const promises = config.files.map(async f => {
            let foundFiles = await asyncGlob(f.source, { root: root });
            foundFiles
                .map(e => path.relative(workspace.uri.fsPath, e))
                .forEach(filePath => {
                    const fileParts = filePath.split(path.sep);
                    let parentPart: string | undefined;
                    for (let i = 0; i < fileParts.length; i++) {
                        const part = fileParts[i];
                        const isLeaf = i === fileParts.length - 1;
                        if (matrix.length - 1 < i) {
                            matrix[i] = new Map();
                        }
                        const fullPath = path.join(workspace.uri.fsPath, ...fileParts.slice(0, i + 1));
                        matrix[i].set(path.join(...fileParts.slice(0, i + 1)), [parentPart, fullPath, isLeaf, f]);
                        if (!!parentPart) {
                            parentPart = parentPart + path.sep + part;
                        } else {
                            parentPart = part;
                        }
                    }
                });
            return foundFiles;
        });
        await Promise.all(promises);
        return matrix;
    }

    static async buildRootFolder(workspace: vscode.WorkspaceFolder, config: ConfigModel, childs: Promise<TmsTreeItem[]>): Promise<TmsTreeItem> {
        const root = !!config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
        const promises = config.files
            .map(async f => {
                let foundFiles = await asyncGlob(f.source, { root: root });
                const sourceFiles: SourceFiles = {
                    files: foundFiles,
                    sourcePattern: f.source,
                    translationPattern: f.translation
                };
                return sourceFiles;
            });
        const sourceFilesArr = await Promise.all(promises);
        return new TmsTreeItem(
            workspace, workspace.name, vscode.TreeItemCollapsibleState.Collapsed,
            childs, config, workspace.uri.fsPath, TmsTreeItemContextValue.ROOT, workspace.uri.fsPath,
            sourceFilesArr
        );
    }

    static buildLeaf(workspace: vscode.WorkspaceFolder, label: string, filePath: string, config: ConfigModel, file: FileModel): TmsTreeItem {
        const command: vscode.Command = {
            command: Constants.OPEN_TMS_FILE_COMMAND,
            title: '',
            arguments: [filePath],
        };
        return new TmsTreeItem(
            workspace, label, vscode.TreeItemCollapsibleState.None, Promise.resolve([]), config,
            workspace.uri.fsPath, TmsTreeItemContextValue.FILE, filePath, [], true, command, file
        );
    }

    static buildFolder(workspace: vscode.WorkspaceFolder, label: string, childs: TmsTreeItem[], config: ConfigModel, path: string) {
        return new TmsTreeItem(
            workspace, label, vscode.TreeItemCollapsibleState.Collapsed, Promise.resolve(childs),
            config, workspace.uri.fsPath, TmsTreeItemContextValue.FOLDER, path
        );
    }

    static compare(e1: TmsTreeItem, e2: TmsTreeItem): number {
        if (e1.collapsibleState === e2.collapsibleState) {
            if (e1.label < e2.label) { return -1; }
            if (e1.label > e2.label) { return 1; }
            return 0;
        }
        return e1.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? -1 : 1;
    }
}