import * as assert from 'assert';
import * as nock from 'nock';
import * as path from 'path';
import { Constants } from '../../constants';
import { CrowdinClient } from '../../client/crowdinClient';

suite("Crowdin client", function () {

    let scope: nock.Scope;

    const projectId = 'TestProject';
    const apiKey = 'TestKey';
    const branch = 'master';
    const client = new CrowdinClient(projectId, apiKey, branch);
    const testFile = path.join(__dirname, '..', '..', '..', 'test-resources', 'test_upload.txt');

    suiteSetup(() => {
        scope = nock(Constants.CROWDIN_URL)
            .get(`/api/project/${projectId}/download/all.zip`)
            .query({
                key: apiKey,
                branch: branch
            })
            .reply(200)
            .get(`/api/project/${projectId}/export`)
            .query({
                key: apiKey,
                branch: branch,
                json: true
            })
            .reply(200)
            .post(`/api/project/${projectId}/add-directory`)
            .query({
                key: apiKey,
                branch: branch,
                name: 'folder1/folder2',
                json: true,
                is_branch: 0,
                recursive: 1
            })
            .reply(200)
            .post(`/api/project/${projectId}/add-file`)
            .query({
                key: apiKey,
                branch: branch,
                json: true
            })
            .reply(200)
            .post(`/api/project/${projectId}/update-file`)
            .query({
                key: apiKey,
                branch: branch,
                json: true
            })
            .reply(200);
    });

    suiteTeardown(() => {
        scope.done();
    });

    test('Download translations', async () => {
        const response = await client.downloadTranslations();
        assert.equal(200, response.status);
    });

    test('Export translations', async () => {
        const response = await client.exportTranslations();
        assert.equal(200, response.status);
    });

    test('Add directory', async () => {
        const response = await client.addDirectory('folder1/folder2', false, true, branch);
        assert.equal(200, response.status);
    });

    test('Add file', async () => {
        const response = await client.addFile(testFile, '%original_file_name%', path.basename(testFile));
        assert.equal(200, response.status);
    });

    test('Update file', async () => {
        const response = await client.updateFile(testFile, '%original_file_name%', path.basename(testFile));
        assert.equal(200, response.status);
    });
});