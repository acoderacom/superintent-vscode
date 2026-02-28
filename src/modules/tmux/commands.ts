import * as vscode from 'vscode';
import type {
    TmuxTreeItem,
    TmuxTreeProvider,
} from './providers/tmuxTreeProvider';
import type { TmuxService } from './services/tmuxService';

export function registerCommands(
    context: vscode.ExtensionContext,
    tmuxService: TmuxService,
    treeProvider: TmuxTreeProvider,
): void {
    // Refresh
    context.subscriptions.push(
        vscode.commands.registerCommand('superintent.tmux.refresh', () => {
            treeProvider.refresh();
        }),
    );

    // Create session
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.createSession',
            async (item?: TmuxTreeItem) => {
                const connectionId = item?.data.connectionId || 'local';

                const name = await vscode.window.showInputBox({
                    prompt: 'Enter session name',
                    placeHolder:
                        'Session name (leave empty for auto-generated)',
                });

                if (name === undefined) {
                    return;
                }

                try {
                    await tmuxService.createSession(
                        connectionId,
                        name || undefined,
                    );
                    vscode.window.showInformationMessage(
                        `Session "${name || 'new session'}" created`,
                    );
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to create session: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Delete session (supports multi-select batch delete)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.deleteSession',
            async (item: TmuxTreeItem, selectedItems?: TmuxTreeItem[]) => {
                const sessionsToDelete: TmuxTreeItem[] = [];

                if (selectedItems && selectedItems.length > 1) {
                    for (const selected of selectedItems) {
                        if (selected.data.session) {
                            sessionsToDelete.push(selected);
                        }
                    }
                } else if (item.data.session) {
                    sessionsToDelete.push(item);
                }

                if (sessionsToDelete.length === 0) {
                    return;
                }

                let confirmMessage: string;

                if (sessionsToDelete.length === 1) {
                    confirmMessage = `Are you sure you want to delete session "${sessionsToDelete[0].data.session?.name}"?`;
                } else {
                    const sessionNames = sessionsToDelete
                        .map((s) => s.data.session?.name)
                        .join(', ');
                    confirmMessage = `Are you sure you want to delete ${sessionsToDelete.length} sessions (${sessionNames})?`;
                }

                const confirm = await vscode.window.showWarningMessage(
                    confirmMessage,
                    { modal: true },
                    'Delete',
                );

                if (confirm !== 'Delete') {
                    return;
                }

                let successCount = 0;
                let failedCount = 0;

                for (const sessionItem of sessionsToDelete) {
                    try {
                        await tmuxService.killSession(
                            sessionItem.data.connectionId,
                            sessionItem.data.session?.name,
                        );
                        successCount++;
                    } catch (error) {
                        failedCount++;
                        console.error(
                            `Failed to delete session ${sessionItem.data.session?.name}:`,
                            error,
                        );
                    }
                }

                treeProvider.refresh();

                if (failedCount === 0) {
                    if (successCount === 1) {
                        vscode.window.showInformationMessage(
                            `Session "${sessionsToDelete[0].data.session?.name}" deleted`,
                        );
                    } else {
                        vscode.window.showInformationMessage(
                            `${successCount} sessions deleted`,
                        );
                    }
                } else {
                    vscode.window.showWarningMessage(
                        `${successCount} sessions deleted, ${failedCount} failed`,
                    );
                }
            },
        ),
    );

    // Copy session ID
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.copySessionId',
            async (item: TmuxTreeItem) => {
                if (!item.data.session) {
                    return;
                }

                await vscode.env.clipboard.writeText(item.data.session.name);
                vscode.window.showInformationMessage(
                    `Copied "${item.data.session.name}"`,
                );
            },
        ),
    );

    // Rename session
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.renameSession',
            async (item: TmuxTreeItem) => {
                if (!item.data.session) {
                    return;
                }

                const newName = await vscode.window.showInputBox({
                    prompt: 'Enter new session name',
                    value: item.data.session.name,
                });

                if (!newName || newName === item.data.session.name) {
                    return;
                }

                try {
                    await tmuxService.renameSession(
                        item.data.connectionId,
                        item.data.session.name,
                        newName,
                    );
                    vscode.window.showInformationMessage(
                        `Session renamed to "${newName}"`,
                    );
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to rename session: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Attach to session
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.attachSession',
            async (item: TmuxTreeItem) => {
                if (!item.data.session) {
                    return;
                }

                const attachCmd = tmuxService.getAttachCommand(
                    item.data.session.name,
                );

                const terminal = vscode.window.createTerminal({
                    name: `tmux: ${item.data.session.name}`,
                });
                terminal.sendText(attachCmd);
                terminal.show();
            },
        ),
    );

    // Quick attach (triggered by status bar click)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.quickAttach',
            async () => {
                interface SessionQuickPickItem extends vscode.QuickPickItem {
                    sessionName: string;
                }

                const items: SessionQuickPickItem[] = [];

                try {
                    const sessions = await tmuxService.listSessions('local');

                    for (const session of sessions) {
                        const icon = session.attached
                            ? '$(check)'
                            : '$(terminal)';

                        items.push({
                            label: `${icon} ${session.name}`,
                            description: `${session.windowCount} windows`,
                            detail: 'Local',
                            sessionName: session.name,
                        });
                    }
                } catch (error) {
                    console.error('Failed to list sessions:', error);
                }

                if (items.length === 0) {
                    vscode.window.showInformationMessage(
                        'No active tmux sessions',
                    );
                    return;
                }

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a session to attach',
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (!selected) {
                    return;
                }

                const attachCmd = tmuxService.getAttachCommand(
                    selected.sessionName,
                );

                const terminal = vscode.window.createTerminal({
                    name: `tmux: ${selected.sessionName}`,
                });
                terminal.sendText(attachCmd);
                terminal.show();
            },
        ),
    );

    // Create window
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.createWindow',
            async (item: TmuxTreeItem) => {
                if (!item.data.session) {
                    return;
                }

                const name = await vscode.window.showInputBox({
                    prompt: 'Enter window name',
                    placeHolder: 'Window name (leave empty for auto-generated)',
                });

                if (name === undefined) {
                    return;
                }

                try {
                    await tmuxService.createWindow(
                        item.data.connectionId,
                        item.data.session.name,
                        name || undefined,
                    );
                    vscode.window.showInformationMessage('Window created');
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to create window: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Delete window (supports multi-select batch delete)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.deleteWindow',
            async (item: TmuxTreeItem, selectedItems?: TmuxTreeItem[]) => {
                const windowsToDelete: TmuxTreeItem[] = [];

                if (selectedItems && selectedItems.length > 1) {
                    for (const selected of selectedItems) {
                        if (selected.data.window && selected.data.session) {
                            windowsToDelete.push(selected);
                        }
                    }
                } else if (item.data.window && item.data.session) {
                    windowsToDelete.push(item);
                }

                if (windowsToDelete.length === 0) {
                    return;
                }

                let confirmMessage: string;

                if (windowsToDelete.length === 1) {
                    confirmMessage = `Are you sure you want to delete window "${windowsToDelete[0].data.window?.name}"?`;
                } else {
                    const windowNames = windowsToDelete
                        .map((w) => w.data.window?.name)
                        .join(', ');
                    confirmMessage = `Are you sure you want to delete ${windowsToDelete.length} windows (${windowNames})?`;
                }

                const confirm = await vscode.window.showWarningMessage(
                    confirmMessage,
                    { modal: true },
                    'Delete',
                );

                if (confirm !== 'Delete') {
                    return;
                }

                // Delete in reverse index order to avoid index shifting
                windowsToDelete.sort(
                    (a, b) => b.data.window?.index - a.data.window?.index,
                );

                let successCount = 0;
                let failedCount = 0;

                for (const windowItem of windowsToDelete) {
                    try {
                        await tmuxService.killWindow(
                            windowItem.data.connectionId,
                            windowItem.data.session?.name,
                            windowItem.data.window?.index,
                        );
                        successCount++;
                    } catch (error) {
                        failedCount++;
                        console.error(
                            `Failed to delete window ${windowItem.data.window?.name}:`,
                            error,
                        );
                    }
                }

                treeProvider.refresh();

                if (failedCount === 0) {
                    if (successCount === 1) {
                        vscode.window.showInformationMessage(
                            `Window "${windowsToDelete[0].data.window?.name}" deleted`,
                        );
                    } else {
                        vscode.window.showInformationMessage(
                            `${successCount} windows deleted`,
                        );
                    }
                } else {
                    vscode.window.showWarningMessage(
                        `${successCount} windows deleted, ${failedCount} failed`,
                    );
                }
            },
        ),
    );

    // Rename window
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.renameWindow',
            async (item: TmuxTreeItem) => {
                if (!item.data.window || !item.data.session) {
                    return;
                }

                const newName = await vscode.window.showInputBox({
                    prompt: 'Enter new window name',
                    value: item.data.window.name,
                });

                if (!newName || newName === item.data.window.name) {
                    return;
                }

                try {
                    await tmuxService.renameWindow(
                        item.data.connectionId,
                        item.data.session.name,
                        item.data.window.index,
                        newName,
                    );
                    vscode.window.showInformationMessage(
                        `Window renamed to "${newName}"`,
                    );
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to rename window: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Select window
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.selectWindow',
            async (item: TmuxTreeItem) => {
                if (!item.data.window || !item.data.session) {
                    return;
                }

                try {
                    await tmuxService.selectWindow(
                        item.data.connectionId,
                        item.data.session.name,
                        item.data.window.index,
                    );
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to switch window: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Split pane horizontal
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.splitPaneHorizontal',
            async (item: TmuxTreeItem) => {
                let target: string;

                if (item.data.pane) {
                    target = item.data.pane.id;
                } else if (item.data.window && item.data.session) {
                    target = `${item.data.session.name}:${item.data.window.index}`;
                } else {
                    return;
                }

                try {
                    await tmuxService.splitPaneHorizontal(
                        item.data.connectionId,
                        target,
                    );
                    vscode.window.showInformationMessage(
                        'Pane split horizontally',
                    );
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to split pane: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Split pane vertical
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.splitPaneVertical',
            async (item: TmuxTreeItem) => {
                let target: string;

                if (item.data.pane) {
                    target = item.data.pane.id;
                } else if (item.data.window && item.data.session) {
                    target = `${item.data.session.name}:${item.data.window.index}`;
                } else {
                    return;
                }

                try {
                    await tmuxService.splitPaneVertical(
                        item.data.connectionId,
                        target,
                    );
                    vscode.window.showInformationMessage(
                        'Pane split vertically',
                    );
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to split pane: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Select pane
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.selectPane',
            async (
                arg: TmuxTreeItem | { connectionId: string; paneId: string },
            ) => {
                let connectionId: string;
                let paneId: string;

                // Supports two call styles: double-click passes simple object, context menu passes TmuxTreeItem
                if ('data' in arg && arg.data.pane) {
                    connectionId = arg.data.connectionId;
                    paneId = arg.data.pane.id;
                } else if ('connectionId' in arg && 'paneId' in arg) {
                    connectionId = arg.connectionId;
                    paneId = arg.paneId;
                } else {
                    return;
                }

                try {
                    await tmuxService.selectPane(connectionId, paneId);
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to switch pane: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Kill pane (supports multi-select batch delete)
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.killPane',
            async (item: TmuxTreeItem, selectedItems?: TmuxTreeItem[]) => {
                const panesToKill: TmuxTreeItem[] = [];

                if (selectedItems && selectedItems.length > 1) {
                    for (const selected of selectedItems) {
                        if (selected.data.pane) {
                            panesToKill.push(selected);
                        }
                    }
                } else if (item.data.pane) {
                    panesToKill.push(item);
                }

                if (panesToKill.length === 0) {
                    return;
                }

                let confirmMessage: string;

                if (panesToKill.length === 1) {
                    confirmMessage = `Are you sure you want to close pane ${panesToKill[0].data.pane?.index}?`;
                } else {
                    const paneIndices = panesToKill
                        .map((p) => p.data.pane?.index)
                        .join(', ');
                    confirmMessage = `Are you sure you want to close ${panesToKill.length} panes (${paneIndices})?`;
                }

                const confirm = await vscode.window.showWarningMessage(
                    confirmMessage,
                    { modal: true },
                    'Close',
                );

                if (confirm !== 'Close') {
                    return;
                }

                // Delete in reverse ID order to avoid ID shifting
                panesToKill.sort((a, b) => {
                    const aIndex = Number.parseInt(
                        a.data.pane?.id.split('.').pop() || '0',
                    );
                    const bIndex = Number.parseInt(
                        b.data.pane?.id.split('.').pop() || '0',
                    );
                    return bIndex - aIndex;
                });

                let successCount = 0;
                let failedCount = 0;

                for (const paneItem of panesToKill) {
                    try {
                        await tmuxService.killPane(
                            paneItem.data.connectionId,
                            paneItem.data.pane?.id,
                        );
                        successCount++;
                    } catch (error) {
                        failedCount++;
                        console.error(
                            `Failed to close pane ${paneItem.data.pane?.id}:`,
                            error,
                        );
                    }
                }

                treeProvider.refresh();

                if (failedCount === 0) {
                    if (successCount === 1) {
                        vscode.window.showInformationMessage('Pane closed');
                    } else {
                        vscode.window.showInformationMessage(
                            `${successCount} panes closed`,
                        );
                    }
                } else {
                    vscode.window.showWarningMessage(
                        `${successCount} panes closed, ${failedCount} failed`,
                    );
                }
            },
        ),
    );

    // Swap pane
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.swapPane',
            async (item: TmuxTreeItem) => {
                if (!item.data.pane) {
                    return;
                }

                const directions = [
                    {
                        label: '$(arrow-up) Swap with previous pane',
                        value: 'U' as const,
                    },
                    {
                        label: '$(arrow-down) Swap with next pane',
                        value: 'D' as const,
                    },
                ];

                const selected = await vscode.window.showQuickPick(directions, {
                    placeHolder: 'Select swap direction',
                });

                if (!selected) {
                    return;
                }

                try {
                    await tmuxService.swapPane(
                        item.data.connectionId,
                        item.data.pane.id,
                        selected.value,
                    );
                    vscode.window.showInformationMessage('Pane swapped');
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to swap pane: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Resize pane
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.resizePane',
            async (item: TmuxTreeItem) => {
                if (!item.data.pane) {
                    return;
                }

                const directions = [
                    {
                        label: '$(arrow-up) Shrink from bottom',
                        value: 'U' as const,
                    },
                    {
                        label: '$(arrow-down) Expand to bottom',
                        value: 'D' as const,
                    },
                    {
                        label: '$(arrow-left) Shrink from right',
                        value: 'L' as const,
                    },
                    {
                        label: '$(arrow-right) Expand to right',
                        value: 'R' as const,
                    },
                ];

                const selected = await vscode.window.showQuickPick(directions, {
                    placeHolder: 'Select resize direction',
                });

                if (!selected) {
                    return;
                }

                const amountStr = await vscode.window.showInputBox({
                    prompt: 'Enter resize amount (lines/columns)',
                    value: '5',
                });

                if (!amountStr) {
                    return;
                }

                const amount = Number.parseInt(amountStr, 10);
                if (Number.isNaN(amount) || amount <= 0) {
                    vscode.window.showErrorMessage(
                        'Amount must be a positive number',
                    );
                    return;
                }

                try {
                    await tmuxService.resizePane(
                        item.data.connectionId,
                        item.data.pane.id,
                        selected.value,
                        amount,
                    );
                    vscode.window.showInformationMessage('Pane resized');
                    treeProvider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to resize pane: ${String(error)}`,
                    );
                }
            },
        ),
    );

    // Toggle mouse mode
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.tmux.toggleMouseMode',
            async (item?: TmuxTreeItem) => {
                const connectionId = item?.data.connectionId || 'local';

                try {
                    const isNowEnabled =
                        await tmuxService.toggleMouseMode(connectionId);
                    if (isNowEnabled) {
                        vscode.window.showInformationMessage(
                            'Mouse mode enabled. You can now use mouse wheel to scroll.',
                        );
                    } else {
                        vscode.window.showInformationMessage(
                            'Mouse mode disabled',
                        );
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to toggle mouse mode: ${String(error)}`,
                    );
                }
            },
        ),
    );
}
