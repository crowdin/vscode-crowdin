import Crowdin from '@crowdin/crowdin-api-client';
import * as vscode from 'vscode';
import { AUTH_TYPE, SCOPES } from './constants';

export interface CrowdinToken {
    accessToken: string;
    expireAt: number;
}

export async function getClient(token?: CrowdinToken): Promise<Crowdin | undefined> {
    if (token) {
        return new Crowdin({ token: token.accessToken, organization: getOrganization(token.accessToken) });
    }

    const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });

    if (!session) {
        return;
    }

    const creds = JSON.parse(session.accessToken) as CrowdinToken;

    //3 min buffer
    if (creds.expireAt - 3 * 60 * 1000 < Date.now()) {
        return;
    }

    return new Crowdin({ token: creds.accessToken, organization: getOrganization(creds.accessToken) });
}

export function isExpired(session: vscode.AuthenticationSession) {
    const creds = JSON.parse(session.accessToken) as CrowdinToken;
    return creds.expireAt - 3 * 60 * 1000 < Date.now();
}

function getOrganization(token: string): string | undefined {
    const parts = token.split('.');

    for (const part of parts) {
        try {
            const object = JSON.parse(atob(part));
            if (object.domain) {
                return object.domain;
            }
        } catch (e) {
            //do nothing
        }
    }
}
