import * as http from 'node:http';
import * as https from 'node:https';
import * as vscode from 'vscode';

export type SSEEventType =
    | 'ticket-updated'
    | 'knowledge-updated'
    | 'spec-updated';

type Listener = () => void;

/**
 * SSE client — connects to /api/events and dispatches events to listeners.
 * Single shared instance, auto-reconnects on failure.
 */
export class SSEClient {
    private listeners = new Map<SSEEventType, Set<Listener>>();
    private request: http.ClientRequest | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectDelay = 3000;
    private disposed = false;
    private configListener: vscode.Disposable;

    constructor() {
        this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('superintent.server.url')) {
                this.reconnect();
            }
        });
        this.connect();
    }

    on(event: SSEEventType, listener: Listener): vscode.Disposable {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(listener);

        return { dispose: () => set?.delete(listener) };
    }

    private getServerUrl(): string {
        return vscode.workspace
            .getConfiguration('superintent')
            .get<string>('server.url', 'http://localhost:3456');
    }

    private connect(): void {
        if (this.disposed) {
            return;
        }

        this.disconnect();

        const baseUrl = this.getServerUrl();
        const url = `${baseUrl}/api/events`;

        try {
            const parsed = new URL(url);
            const mod = parsed.protocol === 'https:' ? https : http;

            this.request = mod.get(url, (res) => {
                if (res.statusCode !== 200) {
                    res.destroy();
                    this.scheduleReconnect();
                    return;
                }

                this.reconnectDelay = 3000;

                let buffer = '';

                res.on('data', (chunk: Buffer) => {
                    buffer += chunk.toString();

                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || '';

                    for (const part of parts) {
                        this.parseEvent(part);
                    }
                });

                res.on('end', () => {
                    this.scheduleReconnect();
                });

                res.on('error', () => {
                    this.scheduleReconnect();
                });
            });

            this.request.on('error', () => {
                this.scheduleReconnect();
            });
        } catch {
            this.scheduleReconnect();
        }
    }

    private parseEvent(raw: string): void {
        let eventType: string | null = null;

        for (const line of raw.split('\n')) {
            if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
            }
        }

        if (eventType) {
            const set = this.listeners.get(eventType as SSEEventType);
            if (set) {
                for (const listener of set) {
                    listener();
                }
            }
        }
    }

    private disconnect(): void {
        if (this.request) {
            this.request.destroy();
            this.request = null;
        }
    }

    private reconnect(): void {
        this.disconnect();
        this.clearReconnectTimer();
        this.reconnectDelay = 3000;
        this.connect();
    }

    private scheduleReconnect(): void {
        if (this.disposed) {
            return;
        }

        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        // Backoff: 3s → 6s → 12s → max 30s
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    dispose(): void {
        this.disposed = true;
        this.disconnect();
        this.clearReconnectTimer();
        this.configListener.dispose();
        this.listeners.clear();
    }
}
