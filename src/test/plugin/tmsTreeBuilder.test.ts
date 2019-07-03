import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigModel } from '../../config/configModel';
import { TmsTreeBuilder } from '../../plugin/tmsTreeBuilder';
import { Constants } from '../../constants';

suite("Plugin tree", function () {

    let config: ConfigModel;
    let workspace: vscode.WorkspaceFolder;

    suiteSetup(() => {
        config = {
            configPath: '',
            apiKey: 'key',
            projectId: 'id',
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
                fsPath: path.join(__dirname, '..', '..', '..', 'test-resources', 'tree'),
                path: '',
                query: '',
                toJSON: () => { },
                toString: () => '',
                with: () => null as unknown as vscode.Uri
            }
        };
        Constants.initialize(new TestContext());
    });

    test('Build files matrix', async () => {
        const matrix = await TmsTreeBuilder.buildFilesMatrix(config, workspace);
        assert.equal(3, matrix.length);
        const level1 = matrix[0];
        const level2 = matrix[1];
        const level3 = matrix[2];
        assert.equal(1, level1.size);
        assert.equal(1, level2.size);
        assert.equal(1, level3.size);
        testMatrix(level1, 'folder1', undefined, config.files[0].translation, false);
        testMatrix(level2, 'folder2', 'folder1', config.files[0].translation, false);
        testMatrix(level3, '3.txt', 'folder2', config.files[0].translation, true);
    });

    test('Build subtree', async () => {
        const tree = await TmsTreeBuilder.buildSubTree(config, workspace);
        assert.equal(1, tree.length);
        const subtree1 = await tree[0].childs;
        assert.equal(1, subtree1.length);
        const subtree2 = subtree1[0];
        const childs = await subtree2.childs;
        assert.equal(1, childs.length);
        const leaf = childs[0];
        assert.equal('3.txt', leaf.label);
    });

});

function testMatrix(map: Map<string, [string | undefined, string, string, boolean]>,
    key: string, parent: string | undefined, translation: string, isLeaf: boolean) {
    const [parent1, translation1, fullPath1, isLeaf1] = map.get(key) || ['', '', '', '', false];
    assert.equal(parent1, parent);
    assert.equal(translation1, translation);
    assert.equal(isLeaf1, isLeaf);
}

class TestContext implements vscode.ExtensionContext {
    subscriptions: { dispose(): any; }[] = [];
    workspaceState: vscode.Memento = new TestMemento();
    globalState: vscode.Memento = new TestMemento();
    extensionPath: string = '';
    asAbsolutePath(relativePath: string): string {
        return '';
    }
    storagePath: string | undefined;
    globalStoragePath: string = '';
    logPath: string = '';
}

class TestMemento implements vscode.Memento {
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get(key: any, defaultValue?: any) {
        throw new Error('Method not implemented.');
    }
    update(key: string, value: any): Thenable<void> {
        throw new Error('Method not implemented.');
    }


}