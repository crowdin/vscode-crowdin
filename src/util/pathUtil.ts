import { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import * as path from 'path';

export class PathUtil {
    static PATH_SEPARATOR_REGEX = '\\' === path.sep ? '\\\\' : path.sep;
    static SPECIAL_SYMBOLS = ['*', '?', '[', ']', '.'];
    static BRANCH_UNALLOWED_SYMBOLS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

    static PLACEHOLDER_ANDROID_CODE = '%android_code%';
    static PLACEHOLDER_FILE_EXTENTION = '%file_extension%';
    static PLACEHOLDER_FILE_NAME = '%file_name%';
    static PLACEHOLDER_LANGUAGE = '%language%';
    static PLACEHOLDER_LOCALE = '%locale%';
    static PLACEHOLDER_LOCALE_WITH_UNDERSCORE = '%locale_with_underscore%';
    static PLACEHOLDER_THREE_LETTERS_CODE = '%three_letters_code%';
    static PLACEHOLDER_TWO_LETTERS_CODE = '%two_letters_code%';
    static PLACEHOLDER_OSX_CODE = '%osx_code%';
    static PLACEHOLDER_OSX_LOCALE = '%osx_locale%';
    static PLACEHOLDER_ORIGINAL_FILE_NAME = '%original_file_name%';
    static PLACEHOLDER_ORIGINAL_PATH = '%original_path%';

    /**
     * Replaces ** in translation pattern
     *
     * @param str string with double asterisk
     * @param fsPath full path to file
     * @param source source pattern from configuration file
     * @param basePath base path from configuration file
     */
    static replaceDoubleAsterisk(str: string, fsPath: string, source: string, basePath: string): string {
        if (!str.includes('**')) {
            return str;
        }
        fsPath = PathUtil.replaceBasePath(fsPath, basePath);
        let replacement = '';
        if (!source.includes('**')) {
            return str;
        }
        source = source.replace(new RegExp('[\\\\/]+', 'g'), '/');
        fsPath = fsPath.replace(new RegExp('[\\\\/]+', 'g'), '/');

        const sourceNodes = source.split('**');
        for (let i = 0; i < sourceNodes.length; i++) {
            if (fsPath.includes(sourceNodes[i])) {
                fsPath = fsPath.replace(sourceNodes[i], '');
            } else if (sourceNodes.length - 1 === i) {
                if (sourceNodes[i].includes('/')) {
                    const sourceNodesTmp = sourceNodes[i].split('/');
                    sourceNodesTmp.forEach((sourceNode) => {
                        let s = '/' + sourceNode + '/';
                        s = s.replace(new RegExp('/+', 'g'), '/');
                        if (fsPath.includes(s)) {
                            fsPath = fsPath.replace(s, '/');
                        } else if (PathUtil.SPECIAL_SYMBOLS.some((symbol) => s.includes(symbol))) {
                            if (fsPath.lastIndexOf('/') > 0) {
                                fsPath = fsPath.substring(0, fsPath.lastIndexOf('/'));
                            } else {
                                fsPath = '/';
                            }
                        }
                    });
                } else if (fsPath.includes('.')) {
                    fsPath = '';
                }
            }
        }
        replacement = fsPath;
        str = str.replace('**', replacement);
        str = str.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        str = str.replace(new RegExp('[\\/]+', 'g'), '/');
        return str;
    }

    /**
     * Replacing file-based placeholders in translation pattern
     * @param str string with file placeholders
     * @param fsPath full path to file
     * @param source source pattern from configuration file
     * @param basePath base path from configuration file
     */
    static replaceFileDependentPlaceholders(str: string, fsPath: string, source: string, basePath: string): string {
        const translationWithoutDoubleAsterisk = PathUtil.replaceDoubleAsterisk(str, fsPath, source, basePath);
        const relativePath = path.relative(basePath, fsPath);
        const fileName = path.basename(relativePath);
        const fileNameWithoutExt = path.parse(fileName).name;
        const fileExt = path.extname(fileName).split('.').pop() || '';
        const fileParent = path
            .dirname(relativePath)
            .replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX)
            .replace(new RegExp('[\\\\/]+', 'g'), '/');
        let result = translationWithoutDoubleAsterisk
            .replace(PathUtil.PLACEHOLDER_ORIGINAL_FILE_NAME, fileName)
            .replace(PathUtil.PLACEHOLDER_FILE_NAME, fileNameWithoutExt)
            .replace(PathUtil.PLACEHOLDER_FILE_EXTENTION, fileExt)
            .replace(PathUtil.PLACEHOLDER_ORIGINAL_PATH, fileParent)
            .replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX)
            .replace(new RegExp('[\\/]+', 'g'), '/');
        return result;
    }

    /**
     * Replacing language-based placeholders in translation pattern
     * @param str string with language placeholders
     * @param language crowdin language object
     * @param languageMapping custom language mapping
     */
    static replaceLanguageDependentPlaceholders(
        str: string,
        language: LanguagesModel.Language,
        languageMapping: ProjectsGroupsModel.LanguageMappingEntity
    ): string {
        return str
            .replace(PathUtil.PLACEHOLDER_LANGUAGE, languageMapping.name || language.name)
            .replace(PathUtil.PLACEHOLDER_LOCALE, languageMapping.locale || language.locale)
            .replace(
                PathUtil.PLACEHOLDER_LOCALE_WITH_UNDERSCORE,
                languageMapping.locale_with_underscore
                    ? languageMapping.locale_with_underscore
                    : language.locale.replace('-', '_')
            )
            .replace(PathUtil.PLACEHOLDER_TWO_LETTERS_CODE, languageMapping.two_letters_code || language.twoLettersCode)
            .replace(
                PathUtil.PLACEHOLDER_THREE_LETTERS_CODE,
                languageMapping.three_letters_code || language.threeLettersCode
            )
            .replace(PathUtil.PLACEHOLDER_ANDROID_CODE, languageMapping.android_code || language.androidCode)
            .replace(PathUtil.PLACEHOLDER_OSX_LOCALE, languageMapping.osx_locale || language.osxLocale)
            .replace(PathUtil.PLACEHOLDER_OSX_CODE, languageMapping.osx_code || language.osxCode);
    }

    private static replaceBasePath(path1: string, basePath: string): string {
        if (!path1 || path1.length === 0) {
            return '';
        }
        let result;
        path1 = path1.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        basePath = basePath.replace(
            new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'),
            PathUtil.PATH_SEPARATOR_REGEX
        );
        result = path1.replace(basePath, path.sep);
        result = result.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        return result;
    }

    static normalizeBranchName(branch: string): string {
        let res = '';
        for (let i = 0; i < branch.length; i++) {
            const character = branch.charAt(i);
            res += this.BRANCH_UNALLOWED_SYMBOLS.includes(character) ? '.' : character;
        }
        return res;
    }
}
