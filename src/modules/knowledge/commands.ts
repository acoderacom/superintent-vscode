import * as vscode from 'vscode';
import type {
    KnowledgeTreeItem,
    KnowledgeTreeProvider,
} from './providers/knowledgeTreeProvider';
import type { KnowledgeWebviewProvider } from './providers/knowledgeWebviewProvider';

export function registerCommands(
    context: vscode.ExtensionContext,
    treeProvider: KnowledgeTreeProvider,
    webviewProvider: KnowledgeWebviewProvider,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('superintent.knowledge.refresh', () => {
            webviewProvider.clearCache();
            treeProvider.refresh();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.knowledge.copyId',
            async (item: KnowledgeTreeItem) => {
                if (!item.data.knowledge) {
                    return;
                }
                await vscode.env.clipboard.writeText(item.data.knowledge.id);
                vscode.window.showInformationMessage(
                    `Copied: ${item.data.knowledge.id}`,
                );
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.knowledge.view',
            async (item: KnowledgeTreeItem) => {
                if (!item.data.knowledge) {
                    return;
                }
                try {
                    await webviewProvider.show(item.data.knowledge.id);
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to load knowledge: ${String(error)}`,
                    );
                }
            },
        ),
    );
}
