import { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import * as assert from 'assert';
import * as path from 'path';
import { PathUtil } from '../../util/pathUtil';

suite('PathUtil', function () {

    test('Replace double asterisk 1', async () => {
        const source = '/**/values/strings.xml';
        const translation = '/**/values-%two_letters_code%/%original_file_name%';
        const fsPath = path.join('D:', 'workspace', 'app', 'src', 'staging', 'res', 'values', 'strings.xml');
        const basePath = path.join('D:', 'workspace');
        const newTranslation = PathUtil.replaceDoubleAsteriskInTranslation(translation, fsPath, source, basePath);
        assert.strictEqual(newTranslation, '/app/src/staging/res/values-%two_letters_code%/%original_file_name%');
    });

    test('Replace double asterisk 2', async () => {
        const source = '/en_GB/**/*.po';
        const translation = '/%two_letters_code%/**/%original_file_name%';
        const fsPath = path.join('d:', 'temp', 'testing', 'project', 'en_GB', 'folder1', 'folder2', 'test.po');
        const basePath = path.join('d:', 'temp', 'testing', 'project');
        const newTranslation = PathUtil.replaceDoubleAsteriskInTranslation(translation, fsPath, source, basePath);
        assert.strictEqual(newTranslation, '/%two_letters_code%/folder1/folder2/%original_file_name%');
    });

    test('Replace file dependent placeholders 1', async () => {
        const source = '/en_GB/**/*.po';
        const translation = '/%two_letters_code%/**/%original_file_name%';
        const fsPath = path.join('d:', 'temp', 'testing', 'project', 'en_GB', 'folder1', 'folder2', 'test.po');
        const basePath = path.join('d:', 'temp', 'testing', 'project');
        const newTranslation = PathUtil.replaceFileDependentPlaceholders(translation, fsPath, source, basePath);
        assert.strictEqual(newTranslation, '/%two_letters_code%/folder1/folder2/test.po');
    });

    test('Replace file dependent placeholders 2', async () => {
        const source = '/src/**/*.po';
        const translation = '/%original_path%/%file_name%.%two_letters_code%.%file_extension%';
        const fsPath = path.join('d:', 'temp', 'testing', 'project', 'src', 'folder1', 'folder2', 'test.txt');
        const basePath = path.join('d:', 'temp', 'testing', 'project');
        const newTranslation = PathUtil.replaceFileDependentPlaceholders(translation, fsPath, source, basePath);
        assert.strictEqual(newTranslation, '/src/folder1/folder2/test.%two_letters_code%.txt');
    });

    test('Replace language dependent placeholders', async () => {
        const translation = '/%original_path%/%file_name%.%two_letters_code%.%file_extension%';
        const language: LanguagesModel.Language = {
            'id': 'es',
            'name': 'Spanish',
            'editorCode': 'es',
            'twoLettersCode': 'es',
            'threeLettersCode': 'spa',
            'locale': 'es-ES',
            'androidCode': 'es-rES',
            'osxCode': 'es.lproj',
            'osxLocale': 'es',
            'pluralCategoryNames': [],
            'pluralRules': '(n != 1)',
            'pluralExamples': [],
            'textDirection': LanguagesModel.TextDirection.LTR,
            'dialectOf': 0
        };
        const newTranslation = PathUtil.replaceLanguageDependentPlaceholders(translation, language, {} as ProjectsGroupsModel.LanguageMappingEntity);
        assert.strictEqual(newTranslation, '/%original_path%/%file_name%.es.%file_extension%');
    });
});