import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigModel } from '../../../config/configModel';
import { FileModel } from '../../../config/fileModel';
import { TmsTreeBuilder } from '../../../plugin/tms/tmsTreeBuilder';

suite("Plugin tree", function () {

    let config: ConfigModel;
    let workspace: vscode.WorkspaceFolder;

    suiteSetup(() => {
        config = {
            configPath: '',
            apiKey: 'key',
            projectId: 5,
            branch: 'master',
            basePath: 'folder1/folder2',
            files: [{
                source: '/**/[^0-2].txt',
                translation: '/**/%two_letters_code%_%original_file_name%'
            }]
        };
        workspace = {
            index: 0,
            name: 'testWorkspace',
            uri: {
                scheme: '',
                authority: '',
                fragment: '',
                fsPath: path.join(__dirname, '..', '..', '..', '..', 'test-resources', 'tree'),
                path: '',
                query: '',
                toJSON: () => { },
                toString: () => '',
                with: () => null as unknown as vscode.Uri
            }
        };
    });

    test('Build files matrix', async () => {
        const matrix = await TmsTreeBuilder.buildFilesMatrix(config, workspace);
        assert.strictEqual(3, matrix.length);
        const level1 = matrix[0];
        const level2 = matrix[1];
        const level3 = matrix[2];
        assert.strictEqual(1, level1.size);
        assert.strictEqual(1, level2.size);
        assert.strictEqual(1, level3.size);
        testMatrix(level1, 'folder1', undefined, config.files[0].translation, false);
        testMatrix(level2, path.join('folder1', 'folder2'), 'folder1', config.files[0].translation, false);
        testMatrix(level3, path.join('folder1', 'folder2', '3.txt'), path.join('folder1', 'folder2'), config.files[0].translation, true);
    });

    test('Build subtree', async () => {
        const tree = await TmsTreeBuilder.buildSubTree(config, workspace);
        assert.strictEqual(1, tree.length);
        const subtree1 = await tree[0].childs;
        assert.strictEqual(1, subtree1.length);
        const subtree2 = subtree1[0];
        const childs = await subtree2.childs;
        assert.strictEqual(1, childs.length);
        const leaf = childs[0];
        assert.strictEqual('3.txt', leaf.label);
    });

});

function testMatrix(map: Map<string, [string | undefined, string, boolean, FileModel]>,
    key: string, parent: string | undefined, translation: string, isLeaf: boolean) {
    const [parent1, fullPath1, isLeaf1, file] = map.get(key) || ['', '', false, {} as FileModel];
    assert.strictEqual(parent1, parent);
    assert.strictEqual(file.translation, translation);
    assert.strictEqual(isLeaf1, isLeaf);
}