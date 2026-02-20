import * as vscode from 'vscode';
import type {
    SpecTreeItem,
    SpecTreeProvider,
} from './providers/specTreeProvider';
import type { SpecWebviewProvider } from './providers/specWebviewProvider';

export function registerCommands(
    context: vscode.ExtensionContext,
    treeProvider: SpecTreeProvider,
    webviewProvider: SpecWebviewProvider,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('superintent.spec.refresh', () => {
            webviewProvider.clearCache();
            treeProvider.refresh();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.spec.copyId',
            async (item: SpecTreeItem) => {
                if (!item.data.spec) {
                    return;
                }
                await vscode.env.clipboard.writeText(item.data.spec.id);
                vscode.window.showInformationMessage(
                    `Copied: ${item.data.spec.id}`,
                );
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.spec.view',
            async (item: SpecTreeItem) => {
                if (!item.data.spec) {
                    return;
                }
                try {
                    await webviewProvider.show(item.data.spec.id);
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to load spec: ${String(error)}`,
                    );
                }
            },
        ),
    );
}
