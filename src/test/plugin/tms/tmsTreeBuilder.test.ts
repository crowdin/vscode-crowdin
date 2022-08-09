import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigModel } from '../../../config/configModel';
import { FileModel } from '../../../config/fileModel';
import { Constants } from '../../../constants';
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
        Constants.initialize(new TestContext());
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

class TestContext implements vscode.ExtensionContext {
    secrets: vscode.SecretStorage = new TestSecretStorage();
    extensionUri: vscode.Uri = vscode.Uri.from({ scheme: '' });
    environmentVariableCollection: vscode.EnvironmentVariableCollection = new TestEnvironmentVariableCollection();
    storageUri: vscode.Uri | undefined;
    globalStorageUri: vscode.Uri = vscode.Uri.from({ scheme: '' });
    logUri: vscode.Uri = vscode.Uri.from({ scheme: '' });;
    extensionMode: vscode.ExtensionMode = vscode.ExtensionMode.Development;
    extension: vscode.Extension<any> = new TestExtension<any>({});;
    subscriptions: { dispose(): any; }[] = [];
    workspaceState: vscode.Memento = new TestMemento();
    globalState = new TestMemento();
    extensionPath: string = '';
    asAbsolutePath(relativePath: string): string {
        return '';
    }
    storagePath: string | undefined;
    globalStoragePath: string = '';
    logPath: string = '';
}

class TestMemento implements vscode.Memento {
    keys(): readonly string[] {
        throw new Error('Method not implemented.');
    }
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get(key: any, defaultValue?: any) {
        throw new Error('Method not implemented.');
    }
    update(key: string, value: any): Thenable<void> {
        throw new Error('Method not implemented.');
    }

    setKeysForSync(keys: readonly string[]) {
        throw new Error('Method not implemented.');
    }

}

class TestSecretStorage implements vscode.SecretStorage {
    get(key: string): Thenable<string | undefined> {
        throw new Error('Method not implemented.');
    }
    store(key: string, value: string): Thenable<void> {
        throw new Error('Method not implemented.');
    }
    delete(key: string): Thenable<void> {
        throw new Error('Method not implemented.');
    }
    onDidChange: vscode.Event<vscode.SecretStorageChangeEvent> = (l) => (new vscode.Disposable(() => { }));

}

class TestEnvironmentVariableCollection implements vscode.EnvironmentVariableCollection {
    persistent: boolean = false;
    replace(variable: string, value: string): void {
        throw new Error('Method not implemented.');
    }
    append(variable: string, value: string): void {
        throw new Error('Method not implemented.');
    }
    prepend(variable: string, value: string): void {
        throw new Error('Method not implemented.');
    }
    get(variable: string): vscode.EnvironmentVariableMutator | undefined {
        throw new Error('Method not implemented.');
    }
    forEach(callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => any, thisArg?: any): void {
        throw new Error('Method not implemented.');
    }
    delete(variable: string): void {
        throw new Error('Method not implemented.');
    }
    clear(): void {
        throw new Error('Method not implemented.');
    }

}

class TestExtension<T> implements vscode.Extension<T> {
    exports: T;
    constructor(value: T) {
        this.exports = value;
    }
    id: string = '';
    extensionUri: vscode.Uri = vscode.Uri.from({ scheme: '' });;
    extensionPath: string = '';
    isActive: boolean = false;
    packageJSON: any;
    extensionKind: vscode.ExtensionKind = vscode.ExtensionKind.Workspace;
    activate(): Thenable<T> {
        throw new Error('Method not implemented.');
    }

}