import * as vscode from 'vscode';
import type {
    TicketTreeItem,
    TicketTreeProvider,
} from './providers/ticketTreeProvider';
import type { TicketWebviewProvider } from './providers/ticketWebviewProvider';

export function registerCommands(
    context: vscode.ExtensionContext,
    treeProvider: TicketTreeProvider,
    webviewProvider: TicketWebviewProvider,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('superintent.ticket.refresh', () => {
            webviewProvider.clearCache();
            treeProvider.refresh();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.ticket.copyId',
            async (item: TicketTreeItem) => {
                if (!item.data.ticket) {
                    return;
                }
                await vscode.env.clipboard.writeText(item.data.ticket.id);
                vscode.window.showInformationMessage(
                    `Copied: ${item.data.ticket.id}`,
                );
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.ticket.view',
            async (item: TicketTreeItem) => {
                if (!item.data.ticket) {
                    return;
                }
                try {
                    await webviewProvider.show(item.data.ticket.id);
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to load ticket: ${String(error)}`,
                    );
                }
            },
        ),
    );
}
