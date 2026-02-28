import * as vscode from 'vscode';
import type { Module } from '../../types/module';
import { registerCommands } from './commands';
import { SystemTreeProvider } from './providers/systemTreeProvider';

export const systemModule: Module = {
    id: 'system',

    activate(context: vscode.ExtensionContext): void {
        const treeProvider = new SystemTreeProvider();

        const treeView = vscode.window.createTreeView(
            'superintent.system.list',
            { treeDataProvider: treeProvider },
        );

        context.subscriptions.push(treeView);
        registerCommands(context);
    },

    deactivate(): void {},
};
