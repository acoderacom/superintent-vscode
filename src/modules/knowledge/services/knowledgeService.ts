import * as vscode from 'vscode';
import type { Knowledge } from '../types';

const REQUEST_TIMEOUT = 10000;
const PAGE_LIMIT = 100;

function getServerUrl(): string {
    return vscode.workspace
        .getConfiguration('superintent')
        .get<string>('server.url', 'http://localhost:3456');
}

interface PaginatedResponse {
    success: boolean;
    data: unknown[];
    pagination: { limit: number; offset: number; hasMore: boolean };
}

function validateResponse(json: unknown): json is PaginatedResponse {
    return (
        typeof json === 'object' &&
        json !== null &&
        'success' in json &&
        'data' in json
    );
}

export class KnowledgeService {
    async listKnowledge(): Promise<Knowledge[]> {
        const all: Knowledge[] = [];
        let offset = 0;

        while (true) {
            const url = `${getServerUrl()}/api/knowledge?status=all&limit=${PAGE_LIMIT}&offset=${offset}`;
            const res = await fetch(url, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT),
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch knowledge: ${res.status}`);
            }
            const json = await res.json();
            if (
                !validateResponse(json) ||
                !json.success ||
                !Array.isArray(json.data)
            ) {
                throw new Error('Invalid server response format');
            }

            all.push(...(json.data as Knowledge[]));

            if (!json.pagination?.hasMore) {
                break;
            }
            offset += PAGE_LIMIT;
        }

        return all;
    }

    async getKnowledge(id: string): Promise<Knowledge> {
        const url = `${getServerUrl()}/api/knowledge/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch knowledge: ${res.status}`);
        }
        const json = await res.json();
        if (
            !validateResponse(json) ||
            !json.success ||
            typeof json.data !== 'object'
        ) {
            throw new Error('Invalid server response format');
        }
        return json.data as Knowledge;
    }

    async setActive(id: string, active: boolean): Promise<void> {
        const url = `${getServerUrl()}/api/knowledge/${encodeURIComponent(id)}/active`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `active=${active}`,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) {
            throw new Error(`Failed to update knowledge: ${res.status}`);
        }
    }
}
