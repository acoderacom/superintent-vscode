import * as vscode from 'vscode';
import type { Module } from '../../types/module';
import { registerCommands } from './commands';
import { StatusBarProvider } from './providers/statusBarProvider';
import { TmuxTreeProvider } from './providers/tmuxTreeProvider';
import { ConnectionManager } from './services/connectionManager';
import { TmuxService } from './services/tmuxService';

let connectionManager: ConnectionManager;
let tmuxService: TmuxService;
let treeProvider: TmuxTreeProvider;
let statusBarProvider: StatusBarProvider;

export const tmuxModule: Module = {
    id: 'tmux',

    activate(context: vscode.ExtensionContext): void {
        connectionManager = new ConnectionManager();
        tmuxService = new TmuxService(connectionManager);
        treeProvider = new TmuxTreeProvider(tmuxService);

        statusBarProvider = new StatusBarProvider();
        statusBarProvider.show();

        const treeView = vscode.window.createTreeView(
            'superintent.tmux.sessions',
            {
                treeDataProvider: treeProvider,
                showCollapseAll: true,
                canSelectMany: true,
            },
        );

        context.subscriptions.push(treeView);

        registerCommands(context, tmuxService, treeProvider);

        context.subscriptions.push({
            dispose: () => {
                treeProvider.dispose();
                statusBarProvider.dispose();
                connectionManager.dispose();
            },
        });
    },

    deactivate(): void {
        if (treeProvider) {
            treeProvider.dispose();
        }

        if (statusBarProvider) {
            statusBarProvider.dispose();
        }

        if (connectionManager) {
            connectionManager.dispose();
        }
    },
};
