import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosResponse } from 'axios';
import * as AdmZip from 'adm-zip';
import * as FormData from 'form-data';
import { Constants } from '../constants';

export class CrowdinClient {

    constructor(
        readonly projectId: string,
        readonly apiKey: string,
        readonly branch?: string) { }

    /**
     * Downloads zip archive from Crowdin system and unzip it in pre-defined folder
     * 
     * @param unzipFolder folder where to unzip downloaded files
     */
    async download(unzipFolder: string): Promise<any> {
        const response = await this.downloadTranslations();
        const zip = new AdmZip(response.data);
        return new Promise((resolve, reject) => {
            zip.extractAllToAsync(unzipFolder, true, (error) => {
                if (!!error) {
                    reject(`Failed to unzip translations for project ${this.projectId}. ${error}`);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Uploads file to the Crowdin system. Creates needed folders/branch is they are missing.
     * 
     * @param fsPath full path to file
     * @param translation file translation
     * @param file file path in crowdin system
     */
    async upload(fsPath: string, translation: string, file: string): Promise<any> {
        if (!!this.branch) {
            try {
                //create branch if not exists
                await this.addDirectory(this.branch, true, false);
            } catch (error) {
                if (!this.objectsExists(error, 50)) {
                    return Promise.reject(`Failed to create branch for project ${this.projectId}. ${this.getErrorMessage(error)}`);
                }
            }
        }
        //check if file has parent folders
        if (path.basename(file) !== file) {
            const folder = this.normalizePath(path.dirname(file));
            try {
                //create file folders if not exists
                await this.addDirectory(folder, false, true, this.branch);
            } catch (error) {
                if (!this.objectsExists(error, 50)) {
                    return Promise.reject(`Failed to create folders for project ${this.projectId}. ${this.getErrorMessage(error)}`);
                }
            }
        }
        const fileName = this.normalizePath(file);
        //add or update file
        try {
            await this.addFile(fsPath, translation, fileName);
            return Promise.resolve();
        } catch (error) {
            if (!this.objectsExists(error, 5)) {
                return Promise.reject(`Failed to add file for project ${this.projectId}. ${this.getErrorMessage(error)}`);
            }
        }
        try {
            await this.updateFile(fsPath, translation, fileName);
        } catch (error) {
            return Promise.reject(`Failed to update file for project ${this.projectId}. ${this.getErrorMessage(error)}`);
        }
    }

    private async downloadTranslations(): Promise<AxiosResponse> {
        try {
            await this.exportTranslations();
        } catch (error) {
            return Promise.reject(`Failed to export translations for project ${this.projectId}. ${this.getErrorMessage(error)}`);
        }
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/download/all.zip?key=${this.apiKey}`;
        if (!!this.branch) {
            url += `&branch=${this.branch}`;
        }
        return axios.get(url, { responseType: 'arraybuffer' });
    }

    private exportTranslations(): Promise<AxiosResponse> {
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/export?key=${this.apiKey}&json=true`;
        if (!!this.branch) {
            url += `&branch=${this.branch}`;
        }
        return axios.get(url);
    }

    private addDirectory(name: string, isBranch = false, recursive = false, branch?: string): Promise<AxiosResponse> {
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/add-directory`;
        url += `?key=${this.apiKey}&json=true&name=${name}&is_branch=${this.convertToNumber(isBranch)}&recursive=${recursive}`;
        if (!!branch) {
            url += `&branch=${branch}`;
        }
        return axios.post(url);
    }

    private addFile(fsPath: string, translation: string, file: string): Promise<AxiosResponse> {
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/add-file?key=${this.apiKey}&json=true`;
        if (!!this.branch) {
            url += `&branch=${this.branch}`;
        }
        return this.uploadFile(fsPath, translation, file, url);
    }

    private updateFile(fsPath: string, translation: string, file: string): Promise<AxiosResponse> {
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/update-file?key=${this.apiKey}&json=true`;
        if (!!this.branch) {
            url += `&branch=${this.branch}`;
        }
        return this.uploadFile(fsPath, translation, file, url);
    }

    private uploadFile(fsPath: string, translation: string, file: string, url: string): Promise<AxiosResponse> {
        const data = new FormData();
        data.append(`files[${file}]`, fs.createReadStream(fsPath));
        data.append(`export_patterns[${file}]`, translation);
        return axios.post(url, data, {
            headers: data.getHeaders()
        });
    }

    private normalizePath(fileName: string): string {
        return fileName.replace(new RegExp('\\' + path.sep, 'g'), Constants.CROWDIN_PATH_SEPARATOR);
    }

    private convertToNumber(flag: boolean): number {
        return flag ? 1 : 0;
    }

    private objectsExists(error: any, code: number): boolean {
        return error.response.data
            && error.response.data.error
            && error.response.data.error.code
            && error.response.data.error.code === code;
    }

    private getErrorMessage(error: any): string {
        if (error.response.data
            && error.response.data.error
            && error.response.data.error.message) {
            return error.response.data.error.message;
        } else {
            return '';
        }
    }
}