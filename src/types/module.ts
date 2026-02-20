import type * as vscode from 'vscode';
import type { SSEClient } from '../services/sseClient';

export interface Module {
    id: string;
    activate(context: vscode.ExtensionContext, sseClient?: SSEClient): void;
    deactivate(): void;
}
