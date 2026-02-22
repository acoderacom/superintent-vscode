import * as vscode from 'vscode';
import type { Ticket, TicketStatus } from '../types';

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

export class TicketService {
    async listTickets(): Promise<Ticket[]> {
        const all: Ticket[] = [];
        let offset = 0;

        while (true) {
            const url = `${getServerUrl()}/api/tickets?limit=${PAGE_LIMIT}&offset=${offset}`;
            const res = await fetch(url, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT),
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch tickets: ${res.status}`);
            }
            const json = await res.json();
            if (
                !validateResponse(json) ||
                !json.success ||
                !Array.isArray(json.data)
            ) {
                throw new Error('Invalid server response format');
            }

            all.push(...(json.data as Ticket[]));

            if (!json.pagination?.hasMore) {
                break;
            }
            offset += PAGE_LIMIT;
        }

        return all;
    }

    async getTicket(id: string): Promise<Ticket> {
        const url = `${getServerUrl()}/api/tickets/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch ticket: ${res.status}`);
        }
        const json = await res.json();
        if (
            !validateResponse(json) ||
            !json.success ||
            typeof json.data !== 'object'
        ) {
            throw new Error('Invalid server response format');
        }
        return json.data as unknown as Ticket;
    }

    async updateTicketStatus(id: string, status: TicketStatus): Promise<void> {
        const url = `${getServerUrl()}/api/tickets/${encodeURIComponent(id)}/status`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `status=${encodeURIComponent(status)}`,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) {
            throw new Error(`Failed to update ticket status: ${res.status}`);
        }
    }
}
