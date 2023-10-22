import Crowdin from '@crowdin/crowdin-api-client';
import axios from 'axios';
import * as vscode from 'vscode';
import { AUTH_TYPE, CLIENT_ID, CLIENT_SECRET, ORGANIZATION, SCOPES } from './constants';

interface CrowdinToken {
    accessToken: string;
    refreshToken: string;
    expireAt: number;
}

export async function getClient(token?: CrowdinToken): Promise<Crowdin | undefined> {
    if (token) {
        return new Crowdin({ token: token.accessToken, organization: ORGANIZATION });
    }

    const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });

    if (!session) {
        return;
    }

    const creds = JSON.parse(session.accessToken) as CrowdinToken;
    //TODO check for expiration
    return new Crowdin({ token: creds.accessToken, organization: ORGANIZATION });
}

export async function getToken(code: string, redirectUri: string): Promise<CrowdinToken> {
    const resp = await axios.post('https://accounts.crowdin.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
    });

    const { access_token, expires_in, refresh_token } = resp.data;
    return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expireAt: Date.now() + expires_in * 1000,
    };
}
