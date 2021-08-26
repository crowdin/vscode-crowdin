import { SourceFilesModel } from '@crowdin/crowdin-api-client';
import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigProvider } from '../../config/configProvider';

suite('Configuration file', function () {

    let workspaceName;
    let uri: vscode.Uri;
    let workspace: vscode.WorkspaceFolder;

    suiteSetup(() => {
        workspaceName = 'testWorkspace';
        uri = {
            scheme: '',
            authority: '',
            fragment: '',
            fsPath: path.join(__dirname, '..', '..', '..', 'test-resources'),
            path: '',
            query: '',
            toJSON: () => { },
            toString: () => '',
            with: () => null as unknown as vscode.Uri
        };
        workspace = {
            index: 0,
            name: workspaceName,
            uri: uri
        };
    });

    test('Load valid config', async () => {
        const file = 'valid_crowdin.yaml';
        const provider = new TestConfigProvider(workspace, file);
        const config = await provider.load();
        assert.strictEqual(123, config.projectId);
        assert.strictEqual('456', config.apiKey);
        assert.strictEqual('master', config.branch);
        assert.strictEqual('testOrg', config.organization);
        assert.strictEqual(2, config.files.length);
        assert.strictEqual(SourceFilesModel.UpdateOption.KEEP_TRANSLATIONS, config.files[0].updateOption);
        assert.strictEqual(false, !!config.files[1].updateOption);
        assert.strictEqual(2, config.files[1].excludedTargetLanguages?.length);
        assert.strictEqual(0, config.files[0].scheme?.identifier);
        assert.strictEqual(1, config.files[0].scheme?.source_phrase);
        assert.strictEqual(2, config.files[0].scheme?.context);
    });

    test('Load invalid config', async () => {
        const file = 'invalid_crowdin.yaml';
        const provider = new TestConfigProvider(workspace, file);
        try {
            const config = await provider.load();
        } catch (e) {
            return;
        }
        assert.fail('Provider did not throw error with invalid config');
    });
});

class TestConfigProvider extends ConfigProvider {

    constructor(public readonly workspace: vscode.WorkspaceFolder, private readonly file: string) {
        super(workspace);
    }

    fileNames(): string[] {
        return [this.file];
    }
}