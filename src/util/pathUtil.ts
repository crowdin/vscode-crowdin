import * as path from 'path';

export class PathUtil {

    static PATH_SEPARATOR_REGEX = '\\' === path.sep ? '\\\\' : path.sep;
    static SPECIAL_SYMBOLS = ['*', '?', '[', ']', '.'];

    /**
     * Replaces ** in translation pattern
     * 
     * @param translation translation pattern from configuration file
     * @param fsPath full path to file
     * @param source source pattern from configuration file
     * @param basePath base path from configuration file
     */
    static replaceDoubleAsteriskInTranslation(translation: string, fsPath: string, source: string, basePath: string): string {
        if (!translation.includes('**')) {
            return translation;
        }
        fsPath = PathUtil.replaceBasePath(fsPath, basePath);
        let replacement = '';
        if (!source.includes('**')) {
            return translation;
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
                    sourceNodesTmp.forEach(sourceNode => {
                        let s = '/' + sourceNode + '/';
                        s = s.replace(new RegExp('/+', 'g'), '/');
                        if (fsPath.includes(s)) {
                            fsPath = fsPath.replace(s, '/');
                        } else if (PathUtil.SPECIAL_SYMBOLS.some(symbol => s.includes(symbol))) {
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
        translation = translation.replace('**', replacement);
        translation = translation.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        translation = translation.replace(new RegExp('[\\/]+', 'g'), '/');
        return translation;
    }

    private static replaceBasePath(path1: string, basePath: string): string {
        if (!path1 || path1.length === 0) {
            return '';
        }
        let result;
        path1 = path1.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        basePath = basePath.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        result = path1.replace(basePath, path.sep);
        result = result.replace(new RegExp(PathUtil.PATH_SEPARATOR_REGEX + '+', 'g'), PathUtil.PATH_SEPARATOR_REGEX);
        return result;
    }
}