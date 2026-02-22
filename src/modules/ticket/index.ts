import * as vscode from 'vscode';
import type { SSEClient } from '../../services/sseClient';
import type { Module } from '../../types/module';
import { registerCommands } from './commands';
import { TicketTreeProvider } from './providers/ticketTreeProvider';
import { TicketWebviewProvider } from './providers/ticketWebviewProvider';
import { TicketService } from './services/ticketService';

export const ticketModule: Module = {
    id: 'ticket',

    activate(context: vscode.ExtensionContext, sseClient?: SSEClient): void {
        const ticketService = new TicketService();
        const treeProvider = new TicketTreeProvider(ticketService);
        const webviewProvider = new TicketWebviewProvider(ticketService);

        const treeView = vscode.window.createTreeView(
            'superintent.ticket.list',
            {
                treeDataProvider: treeProvider,
                dragAndDropController: treeProvider,
                canSelectMany: true,
            },
        );

        context.subscriptions.push(treeView);

        if (sseClient) {
            context.subscriptions.push(
                sseClient.on('ticket-updated', () => treeProvider.refresh()),
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
