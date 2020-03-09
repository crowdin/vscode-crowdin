import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
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
        provider.validate(config);
        assert.equal('123', config.projectId);
        assert.equal('456', config.apiKey);
        assert.equal('master', config.branch);
        assert.equal('testOrg', config.organization);
        assert.equal(1, config.files.length);
    });

    test('Load invalid config', async () => {
        const file = 'invalid_crowdin.yaml';
        const provider = new TestConfigProvider(workspace, file);
        try {
            const config = await provider.load();
            provider.validate(config);
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