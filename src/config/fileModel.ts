import { SourceFilesModel } from '@crowdin/crowdin-api-client';

export interface FileModel {
    source: string;
    translation: string;
    updateOption?: SourceFilesModel.UpdateOption;
    excludedTargetLanguages?: string[];
    labels?: string[];
    scheme?: Scheme;
    dest?: string;
    type?: SourceFilesModel.FileType;
}

export interface Scheme {
    [key: string]: number;
}