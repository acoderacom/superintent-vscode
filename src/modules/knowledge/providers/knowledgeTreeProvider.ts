import * as vscode from 'vscode';
import type { KnowledgeService } from '../services/knowledgeService';
import type { Knowledge, KnowledgeCategory, KnowledgeTreeNodeData } from '../types';

const CATEGORIES: KnowledgeCategory[] = [
    'architecture',
    'pattern',
    'truth',
    'principle',
    'gotcha',
];

export class KnowledgeTreeItem extends vscode.TreeItem {
    public readonly data: KnowledgeTreeNodeData;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        data: KnowledgeTreeNodeData,
    ) {
        super(label, collapsibleState);
        this.data = data;
        this.contextValue = data.type;
    }
}

export class KnowledgeTreeProvider
    implements vscode.TreeDataProvider<KnowledgeTreeItem>
{
    private _onDidChangeTreeData = new vscode.EventEmitter<
        KnowledgeTreeItem | undefined | null
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private knowledgeService: KnowledgeService;
    private knowledgeByCategory = new Map<string, Knowledge[]>();

    constructor(knowledgeService: KnowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    refresh(): void {
        this.knowledgeByCategory.clear();
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: KnowledgeTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(
        element?: KnowledgeTreeItem,
    ): Promise<KnowledgeTreeItem[]> {
        if (!element) {
            return this.getRootChildren();
        }
        if (element.data.type === 'category' && element.data.category) {
            return this.getCategoryChildren(element.data.category);
        }
        return [];
    }

    private async getRootChildren(): Promise<KnowledgeTreeItem[]> {
        try {
            const items = await this.knowledgeService.listKnowledge();

            this.knowledgeByCategory.clear();
            for (const item of items) {
                const category = item.category || 'uncategorized';
                const list = this.knowledgeByCategory.get(category);
                if (list) {
                    list.push(item);
                } else {
                    this.knowledgeByCategory.set(category, [item]);
                }
            }

            return CATEGORIES.map((c) => this.createCategoryNode(c));
        } catch {
            const node = new KnowledgeTreeItem(
                'Cannot connect to server',
                vscode.TreeItemCollapsibleState.None,
                { type: 'info' },
            );
            node.iconPath = new vscode.ThemeIcon('warning');
            node.tooltip =
                'Check that the Superintent server is running and the URL is correct in settings.';
            return [node];
        }
    }

    private getCategoryChildren(category: KnowledgeCategory): KnowledgeTreeItem[] {
        const items = this.knowledgeByCategory.get(category) || [];
        return items.map((k) => this.createKnowledgeNode(k));
    }

    private createCategoryNode(category: KnowledgeCategory): KnowledgeTreeItem {
        const count = this.knowledgeByCategory.get(category)?.length ?? 0;
        const collapsible = count > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
        const node = new KnowledgeTreeItem(
            category,
            collapsible,
            { type: 'category', category },
        );
        node.iconPath = new vscode.ThemeIcon(
            categoryIcon(category),
            new vscode.ThemeColor('icon.foreground'),
        );
        node.description = `${count}`;
        return node;
    }

    private createKnowledgeNode(knowledge: Knowledge): KnowledgeTreeItem {
        const isActive = knowledge.active !== false;
        const node = new KnowledgeTreeItem(
            knowledge.title,
            vscode.TreeItemCollapsibleState.None,
            { type: 'knowledge', knowledge },
        );

        node.contextValue = isActive ? 'knowledge' : 'knowledge-inactive';
        node.iconPath = new vscode.ThemeIcon(
            'lightbulb',
            isActive ? undefined : new vscode.ThemeColor('disabledForeground'),
        );

        const parts: string[] = [];
        if (!isActive) {
            parts.push('inactive');
        }
        if (knowledge.created_at) {
            parts.push(formatRelativeDate(knowledge.created_at));
        }
        if (parts.length > 0) {
            node.description = parts.join(' \u00b7 ');
        }

        const tooltipLines = [`ID: ${knowledge.id}`];
        if (knowledge.category) {
            tooltipLines.push(`Category: ${knowledge.category}`);
        }
        if (knowledge.confidence != null) {
            tooltipLines.push(`Confidence: ${knowledge.confidence}`);
        }
        if (knowledge.tags?.length) {
            tooltipLines.push(`Tags: ${knowledge.tags.join(', ')}`);
        }
        node.tooltip = tooltipLines.join('\n');

        node.command = {
            command: 'superintent.knowledge.view',
            title: 'View Knowledge',
            arguments: [node],
        };

        return node;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}

function categoryIcon(category?: string): string {
    switch (category) {
        case 'architecture':
            return 'extensions';
        case 'pattern':
            return 'symbol-method';
        case 'truth':
            return 'verified';
        case 'principle':
            return 'flame';
        case 'gotcha':
            return 'warning';
        default:
            return 'lightbulb';
    }
}

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        return 'just now';
    }
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
        return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
}
