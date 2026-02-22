import type * as vscode from 'vscode';
import { knowledgeModule } from './modules/knowledge';
import { projectModule } from './modules/project';
import { specModule } from './modules/spec';
import { ticketModule } from './modules/ticket';
import { tmuxModule } from './modules/tmux';
import { SSEClient } from './services/sseClient';
import type { Module } from './types/module';

const modules: Module[] = [
    projectModule,
    tmuxModule,
    specModule,
    knowledgeModule,
    ticketModule,
];

let sseClient: SSEClient;

export function activate(context: vscode.ExtensionContext): void {
    sseClient = new SSEClient();
    context.subscriptions.push(sseClient);

    for (const mod of modules) {
        mod.activate(context, sseClient);
    }
}

export function deactivate(): void {
    for (const mod of modules) {
        mod.deactivate();
    }
}
