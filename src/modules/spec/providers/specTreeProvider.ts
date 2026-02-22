import * as vscode from 'vscode';
import type { SpecService } from '../services/specService';
import type { Spec, SpecTreeNodeData } from '../types';

export class SpecTreeItem extends vscode.TreeItem {
    public readonly data: SpecTreeNodeData;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        data: SpecTreeNodeData,
    ) {
        super(label, collapsibleState);
        this.data = data;
        this.contextValue = data.type;
    }
}

export class SpecTreeProvider implements vscode.TreeDataProvider<SpecTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        SpecTreeItem | undefined | null | void
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private specService: SpecService;

    constructor(specService: SpecService) {
        this.specService = specService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SpecTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(_element?: SpecTreeItem): Promise<SpecTreeItem[]> {
        try {
            const specs = await this.specService.listSpecs();

            if (specs.length === 0) {
                const node = new SpecTreeItem(
                    'No specs found',
                    vscode.TreeItemCollapsibleState.None,
                    { type: 'info' },
                );
                node.iconPath = new vscode.ThemeIcon('info');
                return [node];
            }

            return specs.map((spec) => this.createSpecNode(spec));
        } catch {
            const node = new SpecTreeItem(
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

    private createSpecNode(spec: Spec): SpecTreeItem {
        const node = new SpecTreeItem(
            spec.title,
            vscode.TreeItemCollapsibleState.None,
            { type: 'spec', spec },
        );

        node.iconPath = new vscode.ThemeIcon('file');

        const parts: string[] = [];
        if (spec.author) {
            parts.push(spec.author);
        }
        if (spec.created_at) {
            parts.push(formatRelativeDate(spec.created_at));
        }
        if (parts.length > 0) {
            node.description = parts.join(' \u00b7 ');
        }

        const tooltipLines = [`ID: ${spec.id}`];
        if (spec.author) {
            tooltipLines.push(`Author: ${spec.author}`);
        }
        if (spec.created_at) {
            tooltipLines.push(`Created: ${spec.created_at}`);
        }
        node.tooltip = tooltipLines.join('\n');

        node.command = {
            command: 'superintent.spec.view',
            title: 'View Spec',
            arguments: [node],
        };

        return node;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
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
