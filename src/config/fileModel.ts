import { SourceFilesModel } from '@crowdin/crowdin-api-client';

export interface FileModel {
    source: string;
    translation: string;
    updateOption?: SourceFilesModel.UpdateOption;
}