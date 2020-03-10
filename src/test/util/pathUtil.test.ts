import * as assert from 'assert';
import { PathUtil } from '../../util/pathUtil';

suite('PathUtil', function () {

    test('Replace double asterisk 1', async () => {
        const source = '/**/values/strings.xml';
        const translation = '/**/values-%two_letters_code%/%original_file_name%';
        const fsPath = 'D:/workspace/app/src/staging/res/values/strings.xml';
        const basePath = 'D:/workspace';
        const newTranslation = PathUtil.replaceDoubleAsteriskInTranslation(translation, fsPath, source, basePath);
        assert.equal(newTranslation, '/app/src/staging/res/values-%two_letters_code%/%original_file_name%');
    });

    test('Replace double asterisk 2', async () => {
        const source = '/en_GB/**/*.po';
        const translation = '/%two_letters_code%/**/%original_file_name%';
        const fsPath = 'd:\\temp\\testing\\project\\en_GB\\folder1\\folder2\\test.po';
        const basePath = 'd:\\temp\\testing\\project';
        const newTranslation = PathUtil.replaceDoubleAsteriskInTranslation(translation, fsPath, source, basePath);
        assert.equal(newTranslation, '/%two_letters_code%/folder1/folder2/%original_file_name%');
    });

});