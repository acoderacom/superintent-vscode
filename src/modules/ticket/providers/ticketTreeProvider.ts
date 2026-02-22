import * as vscode from 'vscode';
import type { TicketService } from '../services/ticketService';
import type { Ticket, TicketStatus, TicketTreeNodeData } from '../types';

const PRIMARY_STATUSES: TicketStatus[] = [
    'Backlog',
    'In Progress',
    'In Review',
    'Done',
];

const ARCHIVED_STATUSES: TicketStatus[] = [
    'Blocked',
    'Paused',
    'Abandoned',
    'Superseded',
];

export class TicketTreeItem extends vscode.TreeItem {
    public readonly data: TicketTreeNodeData;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        data: TicketTreeNodeData,
    ) {
        super(label, collapsibleState);
        this.data = data;
        this.contextValue = data.type;
    }
}

const TREE_MIME_TYPE =
    'application/vnd.code.tree.superintent.ticket.list';

export class TicketTreeProvider
    implements
        vscode.TreeDataProvider<TicketTreeItem>,
        vscode.TreeDragAndDropController<TicketTreeItem>
{
    readonly dropMimeTypes = [TREE_MIME_TYPE];
    readonly dragMimeTypes = ['text/plain'];

    private _onDidChangeTreeData = new vscode.EventEmitter<
        // biome-ignore lint/suspicious/noConfusingVoidType: required for EventEmitter.fire() without args
        TicketTreeItem | undefined | null | void
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private ticketService: TicketService;
    private ticketsByStatus = new Map<TicketStatus, Ticket[]>();

    constructor(ticketService: TicketService) {
        this.ticketService = ticketService;
    }

    async handleDrag(
        source: readonly TicketTreeItem[],
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        // Pass plain serializable data — TicketTreeItem instances may lose
        // custom properties when VS Code serializes across process boundaries.
        const items = source
            .filter(
                (item) =>
                    item.data.type === 'ticket' && item.data.ticket?.id,
            )
            .map((item) => ({
                id: item.data.ticket!.id,
                status: item.data.ticket!.status,
            }));

        if (items.length > 0) {
            dataTransfer.set(
                TREE_MIME_TYPE,
                new vscode.DataTransferItem(items),
            );
            dataTransfer.set(
                'text/plain',
                new vscode.DataTransferItem(
                    items.map((t) => t.id).join('\n'),
                ),
            );
        }
    }

    async handleDrop(
        target: TicketTreeItem | undefined,
        dataTransfer: vscode.DataTransfer,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        const transferItem = dataTransfer.get(TREE_MIME_TYPE);
        if (!transferItem || !target) {
            return;
        }

        // Resolve the target status from the drop target
        const targetStatus = this.resolveTargetStatus(target);
        if (!targetStatus) {
            return;
        }

        const draggedItems: { id: string; status: TicketStatus }[] =
            transferItem.value;
        const toMove = draggedItems.filter(
            (item) => item.id && item.status !== targetStatus,
        );

        if (toMove.length === 0) {
            return;
        }

        const results = await Promise.allSettled(
            toMove.map((item) =>
                this.ticketService.updateTicketStatus(
                    item.id,
                    targetStatus,
                ),
            ),
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            vscode.window.showErrorMessage(
                `Failed to move ${failures.length} ticket(s)`,
            );
        }

        this.refresh();
    }

    private resolveTargetStatus(
        target: TicketTreeItem,
    ): TicketStatus | undefined {
        const { type, status, ticket } = target.data;
        if (type === 'category' && status) {
            return status;
        }
        if (type === 'ticket' && ticket) {
            return ticket.status;
        }
        return undefined;
    }

    refresh(): void {
        this.ticketsByStatus.clear();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TicketTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TicketTreeItem): Promise<TicketTreeItem[]> {
        if (!element) {
            return this.getRootChildren();
        }
        if (element.data.type === 'group') {
            return ARCHIVED_STATUSES.map((s) => this.createCategoryNode(s));
        }
        if (element.data.type === 'category' && element.data.status) {
            return this.getCategoryChildren(element.data.status);
        }
        return [];
    }

    private async getRootChildren(): Promise<TicketTreeItem[]> {
        try {
            const tickets = await this.ticketService.listTickets();

            this.ticketsByStatus.clear();
            for (const ticket of tickets) {
                const status = ticket.status || 'Backlog';
                const list = this.ticketsByStatus.get(status);
                if (list) {
                    list.push(ticket);
                } else {
                    this.ticketsByStatus.set(status, [ticket]);
                }
            }

            const categories = PRIMARY_STATUSES.map((s) =>
                this.createCategoryNode(s),
            );
            categories.push(this.createArchivedGroup());
            return categories;
        } catch {
            const node = new TicketTreeItem(
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

    private getCategoryChildren(status: TicketStatus): TicketTreeItem[] {
        const tickets = this.ticketsByStatus.get(status) || [];
        return tickets.map((t) => this.createTicketNode(t));
    }

    private createArchivedGroup(): TicketTreeItem {
        const count = ARCHIVED_STATUSES.reduce(
            (sum, s) => sum + (this.ticketsByStatus.get(s)?.length ?? 0),
            0,
        );
        const collapsible =
            count > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
        const node = new TicketTreeItem('Archived', collapsible, {
            type: 'group',
        });
        node.iconPath = new vscode.ThemeIcon('archive');
        node.description = `${count}`;
        return node;
    }

    private createCategoryNode(status: TicketStatus): TicketTreeItem {
        const count = this.ticketsByStatus.get(status)?.length ?? 0;
        const collapsible =
            count > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
        const node = new TicketTreeItem(status, collapsible, {
            type: 'category',
            status,
        });
        node.iconPath = new vscode.ThemeIcon(statusIcon(status));
        node.description = `${count}`;
        return node;
    }

    private createTicketNode(ticket: Ticket): TicketTreeItem {
        const label = ticket.title || ticket.intent;
        const node = new TicketTreeItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            { type: 'ticket', ticket },
        );

        node.iconPath = new vscode.ThemeIcon(typeIcon(ticket.type));

        const parts: string[] = [];
        if (ticket.type) {
            parts.push(ticket.type);
        }
        if (ticket.change_class) {
            parts.push(`Class ${ticket.change_class}`);
        }
        if (ticket.created_at) {
            parts.push(formatRelativeDate(ticket.created_at));
        }
        if (parts.length > 0) {
            node.description = parts.join(' \u00b7 ');
        }

        const tooltipLines = [`ID: ${ticket.id}`];
        if (ticket.status) {
            tooltipLines.push(`Status: ${ticket.status}`);
        }
        if (ticket.type) {
            tooltipLines.push(`Type: ${ticket.type}`);
        }
        if (ticket.change_class) {
            tooltipLines.push(`Change Class: ${ticket.change_class}`);
        }
        if (ticket.author) {
            tooltipLines.push(`Author: ${ticket.author}`);
        }
        node.tooltip = tooltipLines.join('\n');

        node.command = {
            command: 'superintent.ticket.view',
            title: 'View Ticket',
            arguments: [node],
        };

        return node;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}

function statusIcon(status: string): string {
    switch (status) {
        case 'Backlog':
            return 'inbox';
        case 'In Progress':
            return 'export';
        case 'In Review':
            return 'eye';
        case 'Done':
            return 'check';
        case 'Blocked':
            return 'error';
        case 'Paused':
            return 'debug-pause';
        case 'Abandoned':
            return 'trash';
        case 'Superseded':
            return 'discard';
        default:
            return 'circle-outline';
    }
}

function typeIcon(type: string | undefined): string {
    switch (type) {
        case 'feature':
            return 'sparkle';
        case 'bugfix':
            return 'bug';
        case 'refactor':
            return 'wrench';
        case 'docs':
            return 'book';
        case 'chore':
            return 'gear';
        case 'test':
            return 'beaker';
        default:
            return 'circle-outline';
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
