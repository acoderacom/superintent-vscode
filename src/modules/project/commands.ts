import * as fs from 'node:fs';
import * as vscode from 'vscode';
import type {
    ProjectTreeItem,
    ProjectTreeProvider,
} from './providers/projectTreeProvider';
import type { ProjectService } from './services/projectService';

export function registerCommands(
    context: vscode.ExtensionContext,
    treeProvider: ProjectTreeProvider,
    projectService: ProjectService,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('superintent.project.refresh', () => {
            treeProvider.refresh();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.addCategory',
            async () => {
                const name = await vscode.window.showInputBox({
                    prompt: 'Category name',
                    placeHolder: 'e.g. Work, Personal, Client',
                });
                if (!name) {
                    return;
                }
                await projectService.addCategory(name);
                treeProvider.refresh();
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.addProject',
            async (item: ProjectTreeItem) => {
                if (!item.data.category) {
                    return;
                }
                const uris = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select Project Folder',
                });
                if (!uris || uris.length === 0) {
                    return;
                }
                await projectService.addProject(
                    item.data.category.id,
                    uris[0].fsPath,
                );
                treeProvider.refresh();
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.renameCategory',
            async (item: ProjectTreeItem) => {
                if (!item.data.category) {
                    return;
                }
                const name = await vscode.window.showInputBox({
                    prompt: 'New category name',
                    value: item.data.category.name,
                });
                if (!name || name === item.data.category.name) {
                    return;
                }
                await projectService.renameCategory(
                    item.data.category.id,
                    name,
                );
                treeProvider.refresh();
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.renameProject',
            async (item: ProjectTreeItem) => {
                if (!item.data.project || !item.data.categoryId) {
                    return;
                }
                const name = await vscode.window.showInputBox({
                    prompt: 'New project name',
                    value: item.data.project.name,
                });
                if (!name || name === item.data.project.name) {
                    return;
                }
                await projectService.renameProject(
                    item.data.categoryId,
                    item.data.project.id,
                    name,
                );
                treeProvider.refresh();
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.deleteCategory',
            async (item: ProjectTreeItem) => {
                if (!item.data.category) {
                    return;
                }
                const count = item.data.category.projects.length;
                const message =
                    count > 0
                        ? `Delete category "${item.data.category.name}" and its ${count} project(s)?`
                        : `Delete category "${item.data.category.name}"?`;
                const confirm = await vscode.window.showWarningMessage(
                    message,
                    { modal: true },
                    'Delete',
                );
                if (confirm !== 'Delete') {
                    return;
                }
                await projectService.deleteCategory(item.data.category.id);
                treeProvider.refresh();
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.deleteProject',
            async (item: ProjectTreeItem) => {
                if (!item.data.project || !item.data.categoryId) {
                    return;
                }
                const confirm = await vscode.window.showWarningMessage(
                    `Remove project "${item.data.project.name}"?`,
                    { modal: true },
                    'Remove',
                );
                if (confirm !== 'Remove') {
                    return;
                }
                await projectService.deleteProject(
                    item.data.categoryId,
                    item.data.project.id,
                );
                treeProvider.refresh();
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'superintent.project.openInNewWindow',
            async (item: ProjectTreeItem) => {
                if (!item.data.project) {
                    return;
                }
                const folderPath = item.data.project.path;
                if (!fs.existsSync(folderPath)) {
                    vscode.window.showErrorMessage(
                        `Folder not found: ${folderPath}`,
                    );
                    return;
                }
                await vscode.commands.executeCommand(
                    'vscode.openFolder',
                    vscode.Uri.file(folderPath),
                    { forceNewWindow: true },
                );
            },
        ),
    );
}
