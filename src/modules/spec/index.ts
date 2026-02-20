import * as vscode from 'vscode';
import type { SSEClient } from '../../services/sseClient';
import type { Module } from '../../types/module';
import { registerCommands } from './commands';
import { SpecTreeProvider } from './providers/specTreeProvider';
import { SpecWebviewProvider } from './providers/specWebviewProvider';
import { SpecService } from './services/specService';

export const specModule: Module = {
    id: 'spec',

    activate(context: vscode.ExtensionContext, sseClient?: SSEClient): void {
        const specService = new SpecService();
        const treeProvider = new SpecTreeProvider(specService);
        const webviewProvider = new SpecWebviewProvider(specService);

        const treeView = vscode.window.createTreeView('superintent.spec.list', {
            treeDataProvider: treeProvider,
        });

        context.subscriptions.push(treeView);

        if (sseClient) {
            context.subscriptions.push(
                sseClient.on('spec-updated', () => treeProvider.refresh()),
            );
        }

        registerCommands(context, treeProvider, webviewProvider);

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
