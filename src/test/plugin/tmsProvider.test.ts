import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { TmsProvider } from '../../plugin/tmsProvider';
import { ConfigModel } from '../../config/configModel';
import { TmsTreeItem } from '../../plugin/TmsTreeItem';

suite("Plugin tree", function () {

    let config: ConfigModel;
    let workspace: vscode.WorkspaceFolder;

    setup(() => {
        config = {
            apiKey: 'key',
            projectId: 'id',
            branch: 'master',
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
    });

    test("Building files matrix", async () => {
        const provider = new TestTmsProvider();
        const matrix = await provider.buildFilesMatrix(config, workspace);
        assert.equal(3, matrix.length);
        const level1 = matrix[0];
        const level2 = matrix[1];
        const level3 = matrix[2];
        assert.equal(1, level1.size);
        assert.equal(2, level2.size);
        assert.equal(1, level3.size);
        testMatrix(level1, 'folder1', undefined, config.files[0].translation, path.join(workspace.name, 'folder1'), false);
        testMatrix(level2, 'folder2', 'folder1', config.files[0].translation, path.join(workspace.name, 'folder1', 'folder2'), false);
        testMatrix(level2, 'a.txt', 'folder1', config.files[0].translation, path.join(workspace.name, 'folder1', 'a.txt'), true);
        testMatrix(level3, '3.txt', 'folder2', config.files[0].translation, path.join(workspace.name, 'folder1', 'folder2', '3.txt'), true);
    });

    test("Building subtree", async () => {
        const provider = new TestTmsProvider();
        const tree = await provider.buildSubTree(config, workspace);
        assert.equal(1, tree.length);
        const subtree1 = await tree[0].childs;
        assert.equal(2, subtree1.length);
        const subtree2 = subtree1[0];
        const childs = await subtree2.childs;
        assert.equal(1, childs.length);
        const leaf = subtree1[1];
        assert.equal('a.txt', leaf.label);
    });

});

function testMatrix(map: Map<string, [string | undefined, string, string, string, boolean]>,
    key: string, parent: string | undefined, translation: string, relativePath: string, isLeaf: boolean) {
    const [parent1, translation1, fullPath1, relativePath1, isLeaf1] = map.get(key) || ['', '', '', '', false];
    assert.equal(parent1, parent);
    assert.equal(translation1, translation);
    assert.equal(relativePath1, relativePath);
    assert.equal(isLeaf1, isLeaf);
}

class TestTmsProvider extends TmsProvider {

    async buildSubTree(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<TmsTreeItem[]> {
        return super.buildSubTree(config, workspace);
    }

    async buildFilesMatrix(config: ConfigModel, workspace: vscode.WorkspaceFolder): Promise<Array<Map<string, [string | undefined, string, string, string, boolean]>>> {
        return super.buildFilesMatrix(config, workspace);
    }
}