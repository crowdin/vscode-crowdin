import axios from 'axios';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import { Constants } from '../constants';

export class CrowdinClient {

    constructor(
        readonly projectId: string,
        readonly apiKey: string,
        readonly branch?: string) { }

    async downloadTranslations(unzipFolder: string): Promise<void> {
        await this.exportTranslations();
        const url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/download/all.zip`;
        let parameters = this.buildQueryParams();
        const response = await axios.get(url, { params: parameters, responseType: 'arraybuffer' });
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

    exportTranslations(): Promise<void> {
        const url = `${Constants.CROWDIN_URL}/api/project/${this.projectId}/export`;
        let parameters = this.buildQueryParams();
        return axios.get(url, { params: parameters });
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