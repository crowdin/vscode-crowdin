import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import axios from 'axios';
import Crowdin, { Credentials } from '@crowdin/crowdin-api-client';
import { Constants } from '../constants';

export class CrowdinClient {

    private crowdin: Crowdin;

    constructor(
        readonly projectId: number,
        readonly apiKey: string,
        readonly branch?: string,
        readonly organization?: string) {
        const credentials: Credentials = {
            token: apiKey,
            organization: organization
        };
        this.crowdin = new Crowdin(credentials, {
            userAgent: `crowdin-vscode-plugin/${Constants.PLUGIN_VERSION} vscode/${Constants.VSCODE_VERSION}`,
            retryConfig: {
                conditions: [],
                retries: Constants.CLIENT_RETRIES,
                waitInterval: Constants.CLIENT_RETRY_WAIT_INTERVAL_MS
            }
        });
    }

    /**
     * Downloads zip archive from Crowdin system and unzip it in pre-defined folder
     * 
     * @param unzipFolder folder where to unzip downloaded files
     */
    async download(unzipFolder: string): Promise<any> {
        try {
            let branchId: number | undefined;
            if (!!this.branch) {
                const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, this.branch);
                const foundBranch = branches.data.find(e => e.data.name === this.branch);
                if (!!foundBranch) {
                    branchId = foundBranch.data.id;
                }
            }
            const build = await this.crowdin.translationsApi.buildProject(this.projectId, { branchId });
            let finished = false;

            while (!finished) {
                const status = await this.crowdin.translationsApi.checkBuildStatus(this.projectId, build.data.id);
                finished = status.data.status === 'finished';
            }

            const downloadLink = await this.crowdin.translationsApi.downloadTranslations(this.projectId, build.data.id);
            const resp = await axios.get(downloadLink.data.url, { responseType: 'arraybuffer' });
            const zip = new AdmZip(resp.data);
            return new Promise((resolve, reject) => {
                zip.extractAllToAsync(unzipFolder, true, (error) => {
                    if (!!error) {
                        reject(`Failed to unzip translations for project ${this.projectId}. ${error}`);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            return Promise.reject(`Failed to download translations for project ${this.projectId}. ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Uploads file to the Crowdin system. Creates needed folders/branch is they are missing.
     * 
     * @param fsPath full path to file
     * @param exportPattern file export pattern
     * @param file file path in crowdin system
     */
    async upload(fsPath: string, exportPattern: string, file: string): Promise<any> {
        let branchId: number | undefined;

        if (!!this.branch) {
            try {
                const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, this.branch);
                const foundBranch = branches.data.find(e => e.data.name === this.branch);
                if (!!foundBranch) {
                    branchId = foundBranch.data.id;
                } else {
                    const res = await this.crowdin.sourceFilesApi.createBranch(this.projectId, {
                        name: this.branch
                    });
                    branchId = res.data.id;
                }
            } catch (error) {
                try {
                    branchId = await this.waitAndFindBranch(this.branch);
                } catch (error) {
                    return Promise.reject(`Failed to create/find branch for project ${this.projectId}. ${this.getErrorMessage(error)}`);
                }
            }
        }

        let parentId: number | undefined;
        //check if file has parent folders
        if (path.basename(file) !== file) {
            const folders = this.normalizePath(path.dirname(file))
                .split(Constants.CROWDIN_PATH_SEPARATOR)
                .filter(f => f !== '');
            try {
                for (let i = 0; i < folders.length; i++) {
                    const folder = folders[i];
                    try {
                        const dir = await this.findDirectory(folder, parentId, branchId);
                        if (!!dir) {
                            parentId = dir;
                        } else {
                            const resp = await this.crowdin.sourceFilesApi.createDirectory(this.projectId, {
                                branchId: branchId,
                                directoryId: parentId,
                                name: folder
                            });
                            parentId = resp.data.id;
                        }
                    } catch (error) {
                        parentId = await this.waitAndFindDirectory(folder, parentId, branchId);
                    }
                }
            } catch (error) {
                return Promise.reject(`Failed to create folders for project ${this.projectId}. ${this.getErrorMessage(error)}`);
            }
        }

        const fileName = path.basename(file);
        const fileContent = fs.readFileSync(fsPath, 'utf8');

        try {
            const resp = await this.crowdin.uploadStorageApi.addStorage(fileName, fileContent);
            const storageId = resp.data.id;
            const files = await this.crowdin.sourceFilesApi.listProjectFiles(this.projectId, undefined, parentId, 500);
            const foundFile = files.data
                .filter(f => {
                    if (!branchId) {
                        return !f.data.branchId;
                    } else {
                        return f.data.branchId === branchId;
                    }
                })
                .find(f => f.data.name === fileName);
            if (!!foundFile) {
                await this.crowdin.sourceFilesApi.updateOrRestoreFile(this.projectId, foundFile.data.id, {
                    storageId: storageId,
                    exportOptions: {
                        exportPattern: exportPattern
                    }
                });
            } else {
                await this.crowdin.sourceFilesApi.createFile(this.projectId, {
                    directoryId: parentId,
                    name: fileName,
                    storageId: storageId,
                    exportOptions: {
                        exportPattern: exportPattern
                    }
                });
            }
        } catch (error) {
            return Promise.reject(`Failed to create/update file ${path.basename(file)} for project ${this.projectId}. ${this.getErrorMessage(error)}`);
        }
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
        const dirs = await this.crowdin.sourceFilesApi.listProjectDirectories(this.projectId, undefined, parentId, 500);
        const foundDir = dirs.data
            .filter(dir => {
                if (!branchId) {
                    return !dir.data.branchId;
                } else {
                    return dir.data.branchId === branchId;
                }
            })
            .find(dir => dir.data.name.toLowerCase() === name.toLowerCase());
        if (!!foundDir) {
            return foundDir.data.id;
        } else {
            return undefined;
        }
    }

    private waitAndFindBranch(name: string): Promise<number> {
        return this.crowdin.sourceFilesApi.retryService.executeAsyncFunc(async () => {
            const branches = await this.crowdin.sourceFilesApi.listProjectBranches(this.projectId, name, 500);
            const foundBranch = branches.data.find(branch => branch.data.name.toLowerCase() === name.toLowerCase());
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
        } else if (typeof error === 'string' || error instanceof String) {
            return error as string;
        } else {
            return JSON.stringify(error);
        }
    }
}