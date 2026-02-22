import * as vscode from 'vscode';
import type { SSEClient } from '../../services/sseClient';
import type { Module } from '../../types/module';
import { registerCommands } from './commands';
import { KnowledgeTreeProvider } from './providers/knowledgeTreeProvider';
import { KnowledgeWebviewProvider } from './providers/knowledgeWebviewProvider';
import { KnowledgeService } from './services/knowledgeService';

export const knowledgeModule: Module = {
    id: 'knowledge',

    activate(context: vscode.ExtensionContext, sseClient?: SSEClient): void {
        const knowledgeService = new KnowledgeService();
        const treeProvider = new KnowledgeTreeProvider(knowledgeService);
        const webviewProvider = new KnowledgeWebviewProvider(knowledgeService);

        const treeView = vscode.window.createTreeView(
            'superintent.knowledge.list',
            {
                treeDataProvider: treeProvider,
            },
        );

        context.subscriptions.push(treeView);

        if (sseClient) {
            context.subscriptions.push(
                sseClient.on('knowledge-updated', () => treeProvider.refresh()),
            );
        }

        registerCommands(context, treeProvider, webviewProvider, knowledgeService);

        context.subscriptions.push({
            dispose: () => {
                treeProvider.dispose();
                webviewProvider.dispose();
            },
        });
    },

    deactivate(): void {
        // Disposal handled by context.subscriptions
    },
};
