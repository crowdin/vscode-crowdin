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
        this.crowdin = new Crowdin(credentials);
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
        if (!!this.branch) {
            //TODO get or create branch
            try {
                //create branch if not exists
            } catch (error) {
                return Promise.reject(`Failed to create branch for project ${this.projectId}. ${this.getErrorMessage(error)}`);
            }
        }
        //check if file has parent folders
        if (path.basename(file) !== file) {
            //TODO create directories
            const folders = this.normalizePath(path.dirname(file)).split(Constants.CROWDIN_PATH_SEPARATOR);
            try {
                //TODO create file folders if not exists
            } catch (error) {
                return Promise.reject(`Failed to create folders for project ${this.projectId}. ${this.getErrorMessage(error)}`);
            }
        }
        //TODO create or update file
        const fileName = path.basename(file);
        const fileContent = fs.readFileSync(fsPath, 'utf8');
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