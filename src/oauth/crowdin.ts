import Crowdin from '@crowdin/crowdin-api-client';
import * as vscode from 'vscode';
import { AUTH_TYPE, SCOPES } from './constants';

export interface CrowdinToken {
    accessToken: string;
    expireAt: number;
    organization?: string;
}

export async function getClientCredentials(): Promise<CrowdinToken | undefined> {
    const session = await vscode.authentication.getSession(AUTH_TYPE, SCOPES, { createIfNone: false });

    if (!session) {
        return;
    }

    if (isExpired(session)) {
        vscode.window.showWarningMessage('Crowdin session expired. Please Sign In again.');
        return;
    }

    const creds = JSON.parse(session.accessToken) as CrowdinToken;
    return creds;
}

export async function getClient(token?: CrowdinToken): Promise<Crowdin | undefined> {
    if (token) {
        return new Crowdin({ token: token.accessToken, organization: token.organization });
    }

    const creds = await getClientCredentials();

    if (!creds) {
        return;
    }

    return new Crowdin({ token: creds.accessToken, organization: creds.organization });
}

export function isExpired(session: vscode.AuthenticationSession) {
    const creds = JSON.parse(session.accessToken) as CrowdinToken;
    return creds.expireAt - 3 * 60 * 1000 < Date.now();
}

export function buildToken({ accessToken, expiresIn }: { accessToken: string; expiresIn: number }): CrowdinToken {
    return {
        accessToken,
        expireAt: Date.now() + Number(expiresIn) * 1000,
        organization: getOrganization(accessToken),
    };
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
