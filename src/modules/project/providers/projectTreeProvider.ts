import * as vscode from 'vscode';
import type { ProjectService } from '../services/projectService';
import type { ProjectCategory, ProjectTreeNodeData } from '../types';

export class ProjectTreeItem extends vscode.TreeItem {
    public readonly data: ProjectTreeNodeData;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        data: ProjectTreeNodeData,
    ) {
        super(label, collapsibleState);
        this.data = data;
        this.contextValue = data.type;
    }
}

const TREE_MIME_TYPE = 'application/vnd.code.tree.superintent.project.list';

export class ProjectTreeProvider
    implements
        vscode.TreeDataProvider<ProjectTreeItem>,
        vscode.TreeDragAndDropController<ProjectTreeItem>
{
    readonly dropMimeTypes = [TREE_MIME_TYPE];
    readonly dragMimeTypes = ['text/plain'];

    private _onDidChangeTreeData = new vscode.EventEmitter<
        // biome-ignore lint/suspicious/noConfusingVoidType: required for EventEmitter.fire() without args
        ProjectTreeItem | undefined | null | void
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly projectService: ProjectService) {}

    async handleDrag(
        source: readonly ProjectTreeItem[],
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        const projectItems: Array<{
            type: 'project';
            id: string;
            categoryId: string;
            order: number;
        }> = [];
        for (const item of source) {
            const { project, categoryId } = item.data;
            if (item.data.type === 'project' && project?.id && categoryId) {
                projectItems.push({
                    type: 'project',
                    id: project.id,
                    categoryId,
                    order: project.order,
                });
            }
        }

        const categoryItems: Array<{
            type: 'category';
            id: string;
            order: number;
        }> = [];
        for (const item of source) {
            const { category } = item.data;
            if (item.data.type === 'category' && category?.id) {
                categoryItems.push({
                    type: 'category',
                    id: category.id,
                    order: category.order,
                });
            }
        }

        const items = [...projectItems, ...categoryItems];

        if (items.length > 0) {
            dataTransfer.set(
                TREE_MIME_TYPE,
                new vscode.DataTransferItem(items),
            );
            dataTransfer.set(
                'text/plain',
                new vscode.DataTransferItem(items.map((i) => i.id).join('\n')),
            );
        }
    }

    async handleDrop(
        target: ProjectTreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        const transferItem = dataTransfer.get(TREE_MIME_TYPE);
        if (!transferItem || !target) {
            return;
        }

        const draggedItems: Array<
            | { type: 'project'; id: string; categoryId: string; order: number }
            | { type: 'category'; id: string; order: number }
        > = transferItem.value;

        for (const item of draggedItems) {
            if (item.type === 'category') {
                await this.handleCategoryDrop(item, target);
            } else {
                await this.handleProjectDrop(item, target);
            }
        }

        this.refresh();
    }

    private async handleCategoryDrop(
        dragged: { type: 'category'; id: string; order: number },
        target: ProjectTreeItem,
    ): Promise<void> {
        if (target.data.type !== 'category' || !target.data.category) {
            return;
        }
        if (dragged.id === target.data.category.id) {
            return;
        }
        await this.projectService.reorderCategory(
            dragged.id,
            target.data.category.order,
        );
    }

    private async handleProjectDrop(
        dragged: {
            type: 'project';
            id: string;
            categoryId: string;
            order: number;
        },
        target: ProjectTreeItem,
    ): Promise<void> {
        const targetCategoryId = this.resolveTargetCategoryId(target);
        if (!targetCategoryId) {
            return;
        }

        const targetOrder =
            target.data.type === 'project' && target.data.project
                ? target.data.project.order
                : 0;

        if (dragged.categoryId === targetCategoryId) {
            if (
                target.data.type === 'project' &&
                target.data.project?.id === dragged.id
            ) {
                return;
            }
            await this.projectService.reorderProject(
                targetCategoryId,
                dragged.id,
                targetOrder,
            );
        } else {
            await this.projectService.moveProject(
                dragged.id,
                dragged.categoryId,
                targetCategoryId,
                targetOrder,
            );
        }
    }

    private resolveTargetCategoryId(
        target: ProjectTreeItem,
    ): string | undefined {
        const { type, category, categoryId } = target.data;
        if (type === 'category' && category) {
            return category.id;
        }
        if (type === 'project' && categoryId) {
            return categoryId;
        }
        return undefined;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectTreeItem): ProjectTreeItem[] {
        if (!element) {
            return this.getRootChildren();
        }
        if (element.data.type === 'category' && element.data.category) {
            return this.getCategoryChildren(element.data.category);
        }
        return [];
    }

    private getRootChildren(): ProjectTreeItem[] {
        const categories = this.projectService.getCategories();
        if (categories.length === 0) {
            return [this.createInfoNode()];
        }
        return categories.map((c) => this.createCategoryNode(c));
    }

    private getCategoryChildren(category: ProjectCategory): ProjectTreeItem[] {
        const projects = [...category.projects].sort(
            (a, b) => a.order - b.order,
        );
        return projects.map((p) => this.createProjectNode(p, category.id));
    }

    private createCategoryNode(category: ProjectCategory): ProjectTreeItem {
        const count = category.projects.length;
        const collapsible =
            count > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
        const node = new ProjectTreeItem(category.name, collapsible, {
            type: 'category',
            category,
        });
        node.iconPath = new vscode.ThemeIcon('folder-library');
        node.description = `${count}`;
        return node;
    }

    private createProjectNode(
        project: { id: string; name: string; path: string; order: number },
        categoryId: string,
    ): ProjectTreeItem {
        const node = new ProjectTreeItem(
            project.name,
            vscode.TreeItemCollapsibleState.None,
            { type: 'project', project, categoryId },
        );
        node.iconPath = new vscode.ThemeIcon('folder');
        node.description = project.path;
        node.tooltip = project.path;
        return node;
    }

    private createInfoNode(): ProjectTreeItem {
        const node = new ProjectTreeItem(
            'No categories yet — click + to create one',
            vscode.TreeItemCollapsibleState.None,
            { type: 'info' },
        );
        node.iconPath = new vscode.ThemeIcon('info');
        return node;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
