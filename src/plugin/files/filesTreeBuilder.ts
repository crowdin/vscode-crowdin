import * as glob from 'glob';
import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { ConfigModel } from '../../config/configModel';
import { FileModel } from '../../config/fileModel';
import { Constants } from '../../constants';
import { SourceFiles } from '../../model/sourceFiles';
import { FilesTreeItem } from './filesTreeItem';
import { FilesTreeItemContextValue } from './filesTreeItemContextValue';

const asyncGlob = util.promisify(glob);

export class FilesTreeBuilder {
    static async buildSubTree(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<FilesTreeItem[]> {
        let matrix = await this.buildFilesMatrix(config, workspace);
        let subtree: FilesTreeItem[] = [];
        let childs: Map<string, FilesTreeItem[]> = new Map();
        for (let i = matrix.length - 1; i >= 0; i--) {
            const map = matrix[i];
            let temp = new Map(childs);
            childs.clear();
            map.forEach(([parent, fullPath, isLeaf, file], label) => {
                let item;
                const labelToDisplay = label.split(path.sep)[label.split(path.sep).length - 1];
                if (isLeaf) {
                    item = FilesTreeBuilder.buildLeaf(workspace, labelToDisplay, fullPath, config, file);
                } else {
                    item = FilesTreeBuilder.buildFolder(
                        workspace,
                        labelToDisplay,
                        (temp.get(label) || []).sort(FilesTreeBuilder.compare),
                        config,
                        fullPath
                    );
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
        return subtree.sort(FilesTreeBuilder.compare);
    }

    static async buildFilesMatrix(
        config: ConfigModel,
        workspace: vscode.WorkspaceFolder
    ): Promise<Array<Map<string, [string | undefined, string, boolean, FileModel]>>> {
        let matrix: Array<Map<string, [string | undefined, string, boolean, FileModel]>> = [];
        const root = !!config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
        const promises = config.files.map(async (f) => {
            let foundFiles = await asyncGlob(f.source, { root: root });
            foundFiles
                .map((e) => path.relative(workspace.uri.fsPath, e))
                .forEach((filePath) => {
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

    static async buildRootFolder(
        workspace: vscode.WorkspaceFolder,
        config: ConfigModel,
        childs: Promise<FilesTreeItem[]>
    ): Promise<FilesTreeItem> {
        const root = !!config.basePath ? path.join(workspace.uri.fsPath, config.basePath) : workspace.uri.fsPath;
        const promises = config.files.map(async (f) => {
            let foundFiles = await asyncGlob(f.source, { root: root });
            const sourceFiles: SourceFiles = {
                files: foundFiles,
                sourcePattern: f.source,
                translationPattern: f.translation,
                destPattern: f.dest,
            };
            return sourceFiles;
        });
        const sourceFilesArr = await Promise.all(promises);
        return new FilesTreeItem({
            workspace,
            label: workspace.name,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            childs,
            config,
            rootPath: workspace.uri.fsPath,
            contextValue: FilesTreeItemContextValue.ROOT,
            fullPath: workspace.uri.fsPath,
            sourceFilesArr,
        });
    }

    static buildLeaf(
        workspace: vscode.WorkspaceFolder,
        label: string,
        filePath: string,
        config: ConfigModel,
        file: FileModel
    ): FilesTreeItem {
        const command: vscode.Command = {
            command: Constants.OPEN_FILE_COMMAND,
            title: '',
            arguments: [filePath],
        };
        return new FilesTreeItem({
            workspace,
            label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            config,
            rootPath: workspace.uri.fsPath,
            contextValue: FilesTreeItemContextValue.FILE,
            fullPath: filePath,
            command,
            file,
        });
    }

    static buildFolder(
        workspace: vscode.WorkspaceFolder,
        label: string,
        childs: FilesTreeItem[],
        config: ConfigModel,
        path: string
    ) {
        return new FilesTreeItem({
            workspace,
            label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            childs: Promise.resolve(childs),
            config,
            rootPath: workspace.uri.fsPath,
            contextValue: FilesTreeItemContextValue.FOLDER,
            fullPath: path,
        });
    }

    static compare(e1: FilesTreeItem, e2: FilesTreeItem): number {
        if (e1.collapsibleState === e2.collapsibleState) {
            if (e1.label < e2.label) {
                return -1;
            }
            if (e1.label > e2.label) {
                return 1;
            }
            return 0;
        }
        return e1.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? -1 : 1;
    }
}
