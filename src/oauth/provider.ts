import { v4 as uuid } from 'uuid';
import * as vscode from 'vscode';
import { AUTH_TYPE, CLIENT_ID, SCOPES } from './constants';
import { CrowdinToken, getClient, isExpired } from './crowdin';
import { clearProject } from './selectProject';
import { PromiseAdapter, promiseFromEvent } from './util';

class UriEventHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
    public handleUri(uri: vscode.Uri) {
        this.fire(uri);
    }
}

const AUTH_NAME = `Crowdin`;
const SESSIONS_SECRET_KEY = `${AUTH_TYPE}.sessions`;

export class CrowdinAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {
    private _sessionChangeEmitter =
        new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private _disposable: vscode.Disposable;
    private _codeExchangePromise:
        | { promise: Promise<CrowdinToken>; cancel: vscode.EventEmitter<void>; id: string }
        | undefined;
    private _uriHandler = new UriEventHandler();

    constructor(private readonly context: vscode.ExtensionContext) {
        this._disposable = vscode.Disposable.from(
            vscode.authentication.registerAuthenticationProvider(AUTH_TYPE, AUTH_NAME, this, {
                supportsMultipleAccounts: false,
            }),
            vscode.window.registerUriHandler(this._uriHandler)
        );
    }

    get onDidChangeSessions() {
        return this._sessionChangeEmitter.event;
    }

    get redirectUri() {
        const publisher = this.context.extension.packageJSON.publisher;
        const name = this.context.extension.packageJSON.name;
        return `${vscode.env.uriScheme}://${publisher}.${name}`;
    }

    /**
     * Get the existing sessions
     * @param scopes
     * @returns
     */
    public async getSessions(): Promise<readonly vscode.AuthenticationSession[]> {
        const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);

        if (allSessions) {
            const sessions = JSON.parse(allSessions) as vscode.AuthenticationSession[];
            return sessions.filter((session) => {
                if (isExpired(session)) {
                    this.removeSession(session.id);
                    return false;
                }
                return true;
            });
        }

        return [];
    }

    /**
     * Create a new auth session
     * @param scopes
     * @returns
     */
    public async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
        try {
            const token = await this.login(scopes);

            if (!token) {
                throw new Error(`OAuth login failure`);
            }

            const client = await getClient(token);

            if (!client) {
                throw new Error('Failed to connect');
            }

            const user = await client.usersApi.getAuthenticatedUser();

            const session: vscode.AuthenticationSession = {
                id: uuid(),
                accessToken: JSON.stringify(token),
                account: {
                    label: user.data.username,
                    id: user.data.email,
                },
                scopes: SCOPES,
            };

            await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify([session]));
            await clearProject();

            this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });

            return session;
        } catch (e) {
            vscode.window.showErrorMessage(`Sign in failed: ${e}`);
            throw e;
        }
    }

    /**
     * Remove an existing session
     * @param sessionId
     */
    public async removeSession(sessionId: string): Promise<void> {
        const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY);
        if (allSessions) {
            let sessions = JSON.parse(allSessions) as vscode.AuthenticationSession[];
            const sessionIdx = sessions.findIndex((s) => s.id === sessionId);
            const session = sessions[sessionIdx];
            sessions.splice(sessionIdx, 1);

            await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions));

            if (session) {
                this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] });
            }
        }
    }

    /**
     * Dispose the registered services
     */
    public async dispose() {
        this._disposable.dispose();
    }

    /**
     * Log in to Crowdin OAuth
     */
    private async login(scopes: string[] = []) {
        return await vscode.window.withProgress<CrowdinToken>(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Signing in to Crowdin...',
                cancellable: true,
            },
            async (_, token) => {
                const stateId = uuid();

                const searchParams = new URLSearchParams([
                    ['client_id', CLIENT_ID],
                    ['redirect_uri', this.redirectUri],
                    ['response_type', 'token'],
                    ['state', stateId],
                    ['scope', scopes.join(' ')],
                ]);
                const uri = vscode.Uri.parse(`https://accounts.crowdin.com/oauth/authorize?${searchParams.toString()}`);
                await vscode.env.openExternal(uri);

                if (!this._codeExchangePromise) {
                    this._codeExchangePromise = {
                        ...promiseFromEvent(this._uriHandler.event, this.handleUri()),
                        id: stateId,
                    };
                }

                try {
                    return await Promise.race([
                        this._codeExchangePromise.promise,
                        new Promise<CrowdinToken>((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
                        promiseFromEvent<any, any>(token.onCancellationRequested, (_, __, reject) => {
                            reject('User Cancelled');
                        }).promise,
                    ]);
                } finally {
                    this._codeExchangePromise?.cancel.fire();
                    this._codeExchangePromise = undefined;
                }
            }
        );
    }

    /**
     * Handle the redirect to VS Code (after sign in from Auth0)
     * @param scopes
     * @returns
     */
    private handleUri: () => PromiseAdapter<vscode.Uri, CrowdinToken> = () => async (uri, resolve, reject) => {
        const query = decodeURIComponent(uri.query);
        const params = new URLSearchParams(query);
        const state = params.get('state');
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');

        if (!accessToken || !expiresIn) {
            reject(new Error('Access token not found'));
            return;
        }

        // Check if it is a valid auth request started by the extension
        if (this._codeExchangePromise?.id !== state) {
            reject(new Error('State not found'));
            return;
        }

        resolve({
            accessToken,
            expireAt: Date.now() + Number(expiresIn) * 1000,
        });
    };
}
