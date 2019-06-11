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

    async download(unzipFolder: string): Promise<void> {
        const response = await this.downloadTranslations();
        const zip = new AdmZip(response.data);
        return new Promise((resolve, reject) => {
            zip.extractAllToAsync(unzipFolder, true, (error) => {
                if (!!error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    async upload(fsPath: string, translation: string, file: string): Promise<any> {
        if (!!this.branch) {
            try {
                //create branch if not exists
                await this.addDirectory(this.branch, true);
            } catch (error) {
                if (!this.objectsExists(error, 50)) {
                    return Promise.reject(error);
                }
            }
        }
        const folder = path.dirname(file);
        try {
            //create file folders if not exists
            await this.addDirectory(folder, false, true, this.branch);
        } catch (error) {
            if (!this.objectsExists(error, 50)) {
                return Promise.reject(error);
            }
        }
        //add or update file
        try {
            await this.addFile(fsPath, translation, file);
            return Promise.resolve();
        } catch (error) {
            if (!this.objectsExists(error, 5)) {
                return Promise.reject(error);
            }
        }
        return this.updateFile(fsPath, translation, file);
    }

    private async downloadTranslations(): Promise<AxiosResponse> {
        await this.exportTranslations();
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/download/all.zip?key=${this.apiKey}`;
        if (!!this.branch) {
            url += `&branch=${this.branch}`;
        }
        return axios.get(url, { responseType: 'arraybuffer' });
    }

    private exportTranslations(): Promise<void> {
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/export?key=${this.apiKey}`;
        if (!!this.branch) {
            url += `&branch=${this.branch}`;
        }
        return axios.get(url);
    }

    private addDirectory(name: string, isBranch = false, recursive = false, branch?: string): Promise<AxiosResponse> {
        let url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/add-directory`;
        url += `?key=${this.apiKey}&json=true&name=${name}&is_branch=${isBranch}&recursive=${recursive}&json=true`;
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

    private objectsExists(error: any, code: number): boolean {
        return error.response.data
            && error.response.data.error
            && error.response.data.error.code
            && error.response.data.error.code === code;
    }
}