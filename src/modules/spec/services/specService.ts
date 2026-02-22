import * as vscode from 'vscode';
import type { Spec } from '../types';

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

export class SpecService {
    async listSpecs(): Promise<Spec[]> {
        const all: Spec[] = [];
        let offset = 0;

        while (true) {
            const url = `${getServerUrl()}/api/specs?limit=${PAGE_LIMIT}&offset=${offset}`;
            const res = await fetch(url, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT),
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch specs: ${res.status}`);
            }
            const json = await res.json();
            if (
                !validateResponse(json) ||
                !json.success ||
                !Array.isArray(json.data)
            ) {
                throw new Error('Invalid server response format');
            }

            all.push(...(json.data as Spec[]));

            if (!json.pagination?.hasMore) {
                break;
            }
            offset += PAGE_LIMIT;
        }

        return all;
    }

    async getSpec(id: string): Promise<Spec> {
        const url = `${getServerUrl()}/api/specs/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch spec: ${res.status}`);
        }
        const json = await res.json();
        if (
            !validateResponse(json) ||
            !json.success ||
            typeof json.data !== 'object'
        ) {
            throw new Error('Invalid server response format');
        }
        return json.data as unknown as Spec;
    }
}
