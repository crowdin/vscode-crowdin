import axios, { AxiosResponse } from 'axios';
import * as AdmZip from 'adm-zip';
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

    async upload(fsPath: string, translation: string, file: string): Promise<void> {
        if (!!this.branch) {
            const branchCreated = await this.addDirectory(this.branch, true);
            //TODO check if branch create or exists, otherwise cancel the execution
        }
        const response1 = await this.addFile(fsPath, translation, file);
        //TODO check if file created (then complete the execution) or already exists (then proceed with update file), otherwise cancel the execution
        const response2 = await this.updateFile(fsPath, translation, file);
        //TODO check if file updated and complete the execution, otherwise cancel the execution
    }

    private async downloadTranslations(): Promise<AxiosResponse> {
        await this.exportTranslations();
        const url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/download/all.zip`;
        let parameters = this.buildQueryParams();
        return axios.get(url, { params: parameters, responseType: 'arraybuffer' });
    }

    private exportTranslations(): Promise<void> {
        const url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/export`;
        let parameters = this.buildQueryParams();
        return axios.get(url, { params: parameters });
    }

    private addDirectory(name: string, isBranch = false): Promise<AxiosResponse> {
        const url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/add-directory`;
        const parameters = {
            key: this.apiKey,
            json: true,
            name: name,
            is_branch: isBranch
        };
        return axios.post(url, { params: parameters });
    }

    private addFile(fsPath: string, translation: string, file: string): Promise<AxiosResponse> {
        //TODO implement
        return Promise.resolve(null as unknown as AxiosResponse);
    }

    private updateFile(fsPath: string, translation: string, file: string): Promise<AxiosResponse> {
        //TODO implement
        return Promise.resolve(null as unknown as AxiosResponse);
    }

    private buildQueryParams(): any {
        let parameters: any = {
            key: this.apiKey
        };
        if (!!this.branch) {
            parameters = {
                key: this.apiKey,
                branch: this.branch
            };
        }
        return parameters;
    }
}