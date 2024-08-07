import Crowdin, { Credentials, ProjectsGroupsModel, SourceFilesModel } from '@crowdin/crowdin-api-client';
import * as AdmZip from 'adm-zip';
import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigModel } from '../config/configModel';
import { Scheme } from '../config/fileModel';
import { Constants } from '../constants';
import { SourceFiles } from '../model/sourceFiles';
import { ErrorHandler } from '../util/errorHandler';
import { PathUtil } from '../util/pathUtil';

https.globalAgent.options.rejectUnauthorized = false;

export class CrowdinClient {
    readonly crowdin: Crowdin;
    readonly crowdinWithouRetry: Crowdin;
    readonly projectId: number;
    readonly branch?: string;

    constructor(readonly docUri: vscode.Uri, readonly config: ConfigModel, readonly stringsBased?: boolean) {
        this.projectId = config.projectId;
        this.branch = config.branch;
        const credentials: Credentials = {
            token: config.apiKey,
            organization: config.organization,
        };
        this.crowdin = new Crowdin(credentials, {
            userAgent: `crowdin-vscode-plugin/${Constants.PLUGIN_VERSION} vscode/${Constants.VSCODE_VERSION}`,
            retryConfig: {
                conditions: [],
                retries: Constants.CLIENT_RETRIES,
                waitInterval: Constants.CLIENT_RETRY_WAIT_INTERVAL_MS,
            },
        });
        this.crowdinWithouRetry = new Crowdin(credentials, {
            userAgent: `crowdin-vscode-plugin/${Constants.PLUGIN_VERSION} vscode/${Constants.VSCODE_VERSION}`,
        });
    }

    get crowdinBranch(): { name: string; title: string } | undefined {
        const useGitBranch = vscode.workspace.getConfiguration().get<boolean>(Constants.USE_GIT_BRANCH_PROPERTY);

        if (!useGitBranch) {
            return this.branch ? { name: this.branch, title: this.branch } : undefined;
        }

        const extension = vscode.extensions.getExtension('vscode.git');

        if (extension && extension.isActive) {
            const git = extension.exports.getAPI(1);
            const repository = git.getRepository(this.docUri);
            const name = repository?.state?.HEAD?.name;
            return name ? { name: PathUtil.normalizeBranchName(name), title: name } : undefined;
        }
    }

    async listFiles() {
        let branchId: number | undefined;
        const branch = this.crowdinBranch;

        if (this.stringsBased) {
            if (!branch) {
                throw new Error('Branch is not specified');
            }
        }

        if (branch) {
            const branches = await this.crowdinWithouRetry.sourceFilesApi.listProjectBranches(this.projectId, {
                name: branch.name,
            });
            branchId = branches.data.find((e) => e.data.name === branch.name)?.data.id;

            if (!branchId) {
                throw new Error(`Failed to find branch with name ${branch.name}`);
            }
        }

        const files = await this.crowdinWithouRetry.sourceFilesApi
            .withFetchAll()
            .listProjectFiles(this.projectId, { branchId, recursion: true });

        return files.data.map((f) => f.data);
    }

    async addString({ text, id, fileId }: { text: string; id: string; fileId?: number }) {
        if (!this.stringsBased) {
            await this.crowdinWithouRetry.sourceStringsApi.addString(this.projectId, {
                text,
                identifier: id,
                fileId: fileId!,
            });
            return;
        }

        const branch = this.crowdinBranch;

        if (!branch) {
            throw new Error('Branch is not specified');
        }

        const branches = await this.crowdinWithouRetry.sourceFilesApi.listProjectBranches(this.projectId, {
            name: branch.name,
        });
        const branchId = branches.data.find((e) => e.data.name === branch.name)?.data.id;

        if (!branchId) {
            throw new Error(`Failed to find branch with name ${branch.name}`);
        }

        await this.crowdinWithouRetry.sourceStringsApi.addString(this.projectId, {
            branchId,
            text,
            identifier: id,
        });
    }

    async getStrings() {
        const strings = await this.crowdin.sourceStringsApi.withFetchAll().listProjectStrings(this.projectId);
        return strings.data.map((str) => str.data);
    }

    /**
     * Downloads zip archive from Crowdin system and unzip it in pre-defined folder
     *
     * @param unzipFolder folder where to unzip downloaded files
     * @param sourceFilesArr list of sources and translations from configuration file and found source files
     */
    async download(unzipFolder: string, sourceFilesArr: SourceFiles[]): Promise<any> {
        try {
            const branch = this.crowdinBranch;
            let branchId: number | undefined;
            if (!!branch) {
                const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, {
                    name: branch.name,
                });
                const foundBranch = branches.data.find((e) => e.data.name === branch.name);
                if (!!foundBranch) {
                    branchId = foundBranch.data.id;
                }
            }
            const build = await this.crowdin.translationsApi.buildProject(this.projectId, { branchId });
            let finished = false;

            while (!finished) {
                const statusRes = await this.crowdin.translationsApi.checkBuildStatus(this.projectId, build.data.id);
                const status = statusRes.data.status;
                if (['failed', 'cancelled'].includes(status)) {
                    throw new Error(`Build ${status}`);
                }
                finished = status === 'finished';
            }

            const downloadLink = await this.crowdin.translationsApi.downloadTranslations(this.projectId, build.data.id);
            const resp = await axios.get(downloadLink.data.url, {
                responseType: 'arraybuffer',
            });
            const zip = new AdmZip(resp.data);

            const downloadedTranslationFiles = zip.getEntries().filter((entry) => !entry.isDirectory);
            const translationFilesToDownload = await this.translationFilesToDownload(unzipFolder, sourceFilesArr);
            const filesToUnzip = downloadedTranslationFiles.filter((file) => {
                return translationFilesToDownload.includes(path.join(unzipFolder, file.entryName));
            });

            if (downloadedTranslationFiles.length > 0 && filesToUnzip.length === 0) {
                vscode.window.showWarningMessage(
                    "Downloaded translations don't match the current project configuration. The translations for the following sources will be omitted"
                );
                return;
            }

            const omittedFiles = downloadedTranslationFiles
                .map((file) => file.entryName)
                .filter((entryName) => !filesToUnzip.some((entry) => entry.entryName === entryName));

            if (omittedFiles.length > 0) {
                vscode.window.showWarningMessage(
                    'Due to missing respective sources, the following translations will be omitted: ' +
                        omittedFiles.join(', ')
                );
            }

            filesToUnzip.forEach((file) => {
                const filePath = path.join(unzipFolder, file.entryName);
                const directory = path.dirname(filePath);
                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(directory, { recursive: true });
                }
                fs.writeFileSync(filePath, file.getData());
            });
        } catch (error) {
            throw new Error(
                `Failed to download translations for project ${this.projectId}. ${this.getErrorMessage(error)}`
            );
        }
    }

    /**
     * Downloads bundle for strings based project
     */
    async downloadBundle(unzipFolder: string, bundleId: number): Promise<any> {
        const branch = this.crowdinBranch;
        if (!branch) {
            throw new Error('Branch is not specified');
        }

        const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, {
            name: branch.name,
        });
        const branchId = branches.data.find((e) => e.data.name === branch.name)?.data.id;

        if (!branchId) {
            throw new Error(`Failed to find branch with name ${branch.name}`);
        }

        const { bundlesApi } = this.crowdin;

        try {
            const build = await bundlesApi.exportBundle(this.projectId, bundleId);
            let finished = false;

            while (!finished) {
                const statusRes = await bundlesApi.checkBundleExportStatus(
                    this.projectId,
                    bundleId,
                    build.data.identifier
                );
                const status = statusRes.data.status;
                if (['failed', 'cancelled'].includes(status)) {
                    throw new Error(`Build ${status}`);
                }
                finished = status === 'finished';
            }

            const downloadLink = await bundlesApi.downloadBundle(this.projectId, bundleId, build.data.identifier);

            const resp = await axios.get(downloadLink.data.url, {
                responseType: 'arraybuffer',
            });
            const zip = new AdmZip(resp.data);

            const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

            entries.forEach((file) => {
                const filePath = path.join(unzipFolder, file.entryName);
                const directory = path.dirname(filePath);
                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(directory, { recursive: true });
                }
                fs.writeFileSync(filePath, file.getData());
            });
        } catch (error) {
            throw new Error(`Failed to download bundle for project ${this.projectId}. ${this.getErrorMessage(error)}`);
        }
    }

    private async translationFilesToDownload(basePath: string, sourceFilesArr: SourceFiles[]): Promise<string[]> {
        const languagesResp = await this.crowdin.languagesApi.listSupportedLanguages({ limit: 500 });
        const projectResp = await this.crowdin.projectsGroupsApi.getProject(this.projectId);
        const languageIds = projectResp.data.targetLanguageIds;
        let languageMapping: ProjectsGroupsModel.LanguageMapping = {};
        if (this.isProjectSettings(projectResp.data)) {
            languageMapping = projectResp.data.languageMapping;
            if (projectResp.data.inContext) {
                languageIds.push(projectResp.data.inContextPseudoLanguageId);
            }
        }
        const languages = languagesResp.data.filter((l) => languageIds.includes(l.data.id));
        const files: string[] = [];
        sourceFilesArr.forEach((sourceFiles) => {
            sourceFiles.files.forEach((file) => {
                languages.forEach((language) => {
                    const targetLanguageMapping: ProjectsGroupsModel.LanguageMappingEntity =
                        languageMapping[language.data.id] || {};
                    let translationFile = PathUtil.replaceLanguageDependentPlaceholders(
                        sourceFiles.translationPattern,
                        language.data,
                        targetLanguageMapping
                    );
                    let fsPath = file;
                    if (sourceFiles.destPattern) {
                        const dest = PathUtil.replaceFileDependentPlaceholders(
                            sourceFiles.destPattern,
                            file,
                            sourceFiles.sourcePattern,
                            basePath
                        );
                        fsPath = path.join(basePath, dest);
                    }
                    translationFile = PathUtil.replaceFileDependentPlaceholders(
                        translationFile,
                        fsPath,
                        sourceFiles.sourcePattern,
                        basePath
                    );
                    files.push(translationFile);
                });
            });
        });
        return files.map((file) => path.join(basePath, file));
    }

    private isProjectSettings(data: any): data is ProjectsGroupsModel.ProjectSettings {
        const project = <ProjectsGroupsModel.ProjectSettings>data;
        return project.languageMapping !== undefined || project.inContext !== undefined;
    }

    /**
     * Uploads file to the Crowdin system. Creates needed folders/branch is they are missing.
     */
    async upload({
        fsPath,
        exportPattern,
        file,
        uploadOption,
        excludedTargetLanguages,
        labels,
        scheme,
        type,
        cleanupMode,
        updateStrings,
    }: {
        fsPath: string;
        exportPattern: string;
        file: string;
        uploadOption?: SourceFilesModel.UpdateOption;
        excludedTargetLanguages?: string[];
        labels?: string[];
        scheme?: Scheme;
        type?: SourceFilesModel.FileType;
        cleanupMode?: boolean;
        updateStrings?: boolean;
    }): Promise<void> {
        let branchId: number | undefined;
        const branch = this.crowdinBranch;

        if (this.stringsBased) {
            if (!branch) {
                throw new Error('Branch is not specified');
            }
        }

        if (!!branch) {
            try {
                const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, {
                    name: branch.name,
                });
                const foundBranch = branches.data.find((e) => e.data.name === branch.name);
                if (!!foundBranch) {
                    branchId = foundBranch.data.id;
                } else {
                    const res = await this.crowdin.sourceFilesApi.createBranch(this.projectId, {
                        name: branch.name,
                        title: branch.title,
                    });
                    branchId = res.data.id;
                }
            } catch (error) {
                try {
                    if (!this.concurrentIssue(error)) {
                        throw error;
                    }
                    branchId = await this.waitAndFindBranch(branch.name);
                } catch (error) {
                    throw new Error(
                        `Failed to create/find branch for project ${this.projectId}. ${this.getErrorMessage(error)}`
                    );
                }
            }
        }

        const fileName = path.basename(file);
        const fileContent = fs.readFileSync(fsPath);

        if (this.stringsBased) {
            if (!branchId) {
                throw new Error('Branch is missing');
            }

            try {
                const resp = await this.crowdin.uploadStorageApi.addStorage(fileName, fileContent);
                const build = await this.crowdin.sourceStringsApi.uploadStrings(this.projectId, {
                    branchId,
                    storageId: resp.data.id,
                    cleanupMode,
                    updateStrings,
                });
                let finished = false;

                while (!finished) {
                    const statusRes = await this.crowdin.sourceStringsApi.uploadStringsStatus(
                        this.projectId,
                        build.data.identifier
                    );
                    const status = statusRes.data.status;
                    if (['failed', 'cancelled'].includes(status)) {
                        throw new Error('Failed to upload strings');
                    }
                    finished = status === 'finished';
                }
            } catch (error) {
                const msg = ErrorHandler.getMessage(error);
                if (msg.includes('files are not allowed to upload in strings-based projects')) {
                    vscode.window.showWarningMessage(msg);
                } else {
                    throw error;
                }
            }

            return;
        }

        let parentId: number | undefined;
        //check if file has parent folders
        if (path.basename(file) !== file) {
            const folders = this.normalizePath(path.dirname(file))
                .split(Constants.CROWDIN_PATH_SEPARATOR)
                .filter((f) => f !== '');
            try {
                for (let i = 0; i < folders.length; i++) {
                    const folder = folders[i];
                    try {
                        const dir = await this.findDirectory(folder, parentId, branchId);
                        if (!!dir) {
                            parentId = dir;
                        } else {
                            const resp = await this.crowdin.sourceFilesApi.createDirectory(this.projectId, {
                                branchId: !!parentId ? undefined : branchId,
                                directoryId: parentId,
                                name: folder,
                            });
                            parentId = resp.data.id;
                        }
                    } catch (error) {
                        if (!this.concurrentIssue(error)) {
                            throw error;
                        }
                        parentId = await this.waitAndFindDirectory(folder, parentId, branchId);
                    }
                }
            } catch (error) {
                throw new Error(
                    `Failed to create folders for project ${this.projectId}. ${this.getErrorMessage(error)}`
                );
            }
        }

        try {
            const resp = await this.crowdin.uploadStorageApi.addStorage(fileName, fileContent);
            const storageId = resp.data.id;
            const files = await this.crowdin.sourceFilesApi
                .withFetchAll()
                .listProjectFiles(this.projectId, { directoryId: parentId });
            const foundFile = files.data
                .filter((f) => {
                    if (!branchId) {
                        return !f.data.branchId;
                    } else {
                        return f.data.branchId === branchId;
                    }
                })
                .find((f) => f.data.name === fileName);
            if (!!foundFile) {
                await this.crowdin.sourceFilesApi.updateOrRestoreFile(this.projectId, foundFile.data.id, {
                    storageId: storageId,
                    updateOption: uploadOption,
                    exportOptions: {
                        exportPattern: exportPattern,
                    },
                });
            } else {
                let labelIds;
                if (!!labels) {
                    labelIds = [];
                    const labelsFromRemote = await this.crowdin.labelsApi.withFetchAll().listLabels(this.projectId);
                    for (const label of labels) {
                        const formattedLabel = label.trim().toLowerCase();
                        const foundLabel = labelsFromRemote.data.find(
                            (l) => l.data.title.toLocaleLowerCase() === formattedLabel
                        );
                        if (foundLabel) {
                            labelIds.push(foundLabel.data.id);
                        } else {
                            try {
                                const createdLabel = await this.crowdin.labelsApi.addLabel(this.projectId, {
                                    title: label.trim(),
                                });
                                labelIds.push(createdLabel.data.id);
                            } catch (error) {
                                if (!this.concurrentIssue(error)) {
                                    throw error;
                                }
                                const missingLabel = await this.crowdin.labelsApi.retryService.executeAsyncFunc(
                                    async () => {
                                        const allLabels = await this.crowdin.labelsApi
                                            .withFetchAll()
                                            .listLabels(this.projectId);
                                        const neededLabel = allLabels.data.find(
                                            (l) => l.data.title.toLocaleLowerCase() === formattedLabel
                                        );
                                        if (neededLabel) {
                                            return neededLabel;
                                        } else {
                                            throw new Error(`Could not find label ${label.trim()} in Crowdin response`);
                                        }
                                    }
                                );
                                labelIds.push(missingLabel.data.id);
                            }
                        }
                    }
                }
                await this.crowdin.sourceFilesApi.createFile(this.projectId, {
                    branchId: !!parentId ? undefined : branchId,
                    directoryId: parentId,
                    name: fileName,
                    storageId: storageId,
                    exportOptions: {
                        exportPattern: exportPattern,
                    },
                    importOptions:
                        scheme &&
                        ({
                            scheme: scheme,
                        } as unknown as SourceFilesModel.SpreadsheetImportOptions),
                    excludedTargetLanguages,
                    attachLabelIds: labelIds,
                    type,
                });
            }
        } catch (error) {
            throw new Error(
                `Failed to create/update file ${path.basename(file)} for project ${
                    this.projectId
                }. ${this.getErrorMessage(error)}`
            );
        }
    }

    /**
     *
     * @param fsPath file path in fs
     * @param file file path in crowdin
     */
    async downloadSourceFile(fsPath: string, file: string): Promise<void> {
        let branchId: number | undefined;
        const branch = this.crowdinBranch;

        if (!!branch) {
            const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, {
                name: branch.name,
            });
            const foundBranch = branches.data.find((e) => e.data.name === branch.name);
            if (!!foundBranch) {
                branchId = foundBranch.data.id;
            } else {
                throw new Error(`File ${file} does not exist under branch ${branch.name}`);
            }
        }
        let parentId: number | undefined;
        if (path.basename(file) !== file) {
            const folders = this.normalizePath(path.dirname(file))
                .split(Constants.CROWDIN_PATH_SEPARATOR)
                .filter((f) => f !== '');
            for (let i = 0; i < folders.length; i++) {
                const folder = folders[i];
                const dir = await this.findDirectory(folder, parentId, branchId);
                if (!!dir) {
                    parentId = dir;
                } else {
                    throw new Error(`File ${file} does not exist under directory ${path.dirname(file)}`);
                }
            }
        }
        const fileName = path.basename(file);
        const files = await this.crowdin.sourceFilesApi
            .withFetchAll()
            .listProjectFiles(this.projectId, { directoryId: parentId });
        const foundFile = files.data
            .filter((f) => {
                if (!branchId) {
                    return !f.data.branchId;
                } else {
                    return f.data.branchId === branchId;
                }
            })
            .find((f) => f.data.name === fileName);
        if (!foundFile) {
            throw new Error(`File ${file} does not exist`);
        }
        const downloadLink = await this.crowdin.sourceFilesApi.downloadFile(this.projectId, foundFile.data.id);
        const content = await axios.get(downloadLink.data.url, {
            responseType: 'arraybuffer',
        });
        fs.writeFileSync(fsPath, content.data);
    }

    private waitAndFindDirectory(name: string, parentId?: number, branchId?: number): Promise<number> {
        return this.crowdin.sourceFilesApi.retryService.executeAsyncFunc(async () => {
            const foundDir = await this.findDirectory(name, parentId, branchId);
            if (!!foundDir) {
                return foundDir;
            } else {
                throw new Error(`Could not find directory ${name} in Crowdin response`);
            }
        });
    }

    private async findDirectory(name: string, parentId?: number, branchId?: number): Promise<number | undefined> {
        const dirs = await this.crowdin.sourceFilesApi
            .withFetchAll()
            .listProjectDirectories(this.projectId, { directoryId: parentId });
        const foundDir = dirs.data
            .filter((dir) => {
                if (!branchId) {
                    return !dir.data.branchId;
                } else {
                    return dir.data.branchId === branchId;
                }
            })
            .find((dir) => dir.data.name.toLowerCase() === name.toLowerCase());
        if (!!foundDir) {
            return foundDir.data.id;
        } else {
            return undefined;
        }
    }

    private waitAndFindBranch(name: string): Promise<number> {
        return this.crowdin.sourceFilesApi.retryService.executeAsyncFunc(async () => {
            const branches = await this.crowdin.sourceFilesApi
                .withFetchAll()
                .listProjectBranches(this.projectId, { name });
            const foundBranch = branches.data.find((branch) => branch.data.name.toLowerCase() === name.toLowerCase());
            if (!!foundBranch) {
                return foundBranch.data.id;
            } else {
                throw new Error(`Could not find branch ${name} in Crowdin response`);
            }
        });
    }

    private normalizePath(fileName: string): string {
        return fileName.replace(new RegExp('\\' + path.sep, 'g'), Constants.CROWDIN_PATH_SEPARATOR);
    }

    private getErrorMessage(error: any): string {
        if (error.message) {
            return error.message;
        } else if (error.error && error.error.message) {
            return error.error.message;
        } else if (error.errors && Array.isArray(error.errors)) {
            return error.errors
                .filter((e: any) => !!e.error)
                .map((e: any) => e.error)
                .filter((e: any) => Array.isArray(e.errors))
                .map((e: any) => {
                    const key = e.key || '';
                    return (
                        key +
                        ' ' +
                        e.errors
                            .map((e1: any) => {
                                if (e1.code && e1.message) {
                                    return e1.code + ' ' + e1.message;
                                } else {
                                    return JSON.stringify(e1);
                                }
                            })
                            .join(';')
                    );
                })
                .join(';');
        } else if (typeof error === 'string' || error instanceof String) {
            return error as string;
        } else {
            return JSON.stringify(error);
        }
    }

    private concurrentIssue(error: any): boolean {
        return this.codeExists(error, 'notUnique') || this.codeExists(error, 'parallelCreation');
    }

    private codeExists(e: any, code: string): boolean {
        if (e.errors && Array.isArray(e.errors)) {
            return !!e.errors
                .filter((e: any) => !!e.error)
                .map((e: any) => e.error)
                .filter((e: any) => Array.isArray(e.errors))
                .find(
                    (e: any) =>
                        !!e.errors
                            .filter(
                                (e1: any) => !!e1.code && (typeof e1.code === 'string' || e1.code instanceof String)
                            )
                            .map((e1: any) => e1.code)
                            .find((c: string) => c.toLowerCase() === code.toLowerCase())
                );
        }

        if (e.validationCodes && Array.isArray(e.validationCodes)) {
            return e.validationCodes
                .filter((e: any) => !!e.codes)
                .map((e: any) => e.codes)
                .some((codes: string[]) => codes.includes(code));
        }

        return false;
    }
}
