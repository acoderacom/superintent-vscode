import * as vscode from 'vscode';
import type { Module } from '../../types/module';
import { registerCommands } from './commands';
import { ProjectTreeProvider } from './providers/projectTreeProvider';
import { ProjectService } from './services/projectService';

export const projectModule: Module = {
    id: 'project',

    activate(context: vscode.ExtensionContext): void {
        const projectService = new ProjectService(context);
        const treeProvider = new ProjectTreeProvider(projectService);

        const treeView = vscode.window.createTreeView(
            'superintent.project.list',
            {
                treeDataProvider: treeProvider,
                dragAndDropController: treeProvider,
                canSelectMany: true,
            },
        );

        context.subscriptions.push(treeView);

        registerCommands(context, treeProvider, projectService);

        context.subscriptions.push({
            dispose: () => {
                treeProvider.dispose();
            },
        });
    },

    deactivate(): void {
        // Disposal handled by context.subscriptions
    },
};
