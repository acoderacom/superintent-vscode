import * as vscode from 'vscode';
import type { TmuxService } from '../services/tmuxService';
import type {
    SessionGroup,
    TmuxSession,
    TmuxWindow,
    TreeNodeData,
} from '../types';

/**
 * Tmux tree item
 */
export class TmuxTreeItem extends vscode.TreeItem {
    public readonly data: TreeNodeData;

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        data: TreeNodeData,
    ) {
        super(label, collapsibleState);
        this.data = data;
        this.contextValue = data.type;
        this.setAppearance();
    }

    private setAppearance(): void {
        switch (this.data.type) {
            case 'group':
                this.iconPath =
                    this.data.group === 'remote'
                        ? new vscode.ThemeIcon('remote')
                        : new vscode.ThemeIcon('home');
                break;

            case 'session':
                this.iconPath = new vscode.ThemeIcon('folder');
                if (this.data.session?.attached) {
                    this.description = '(attached)';
                    this.iconPath = new vscode.ThemeIcon('folder-active');
                }
                break;

            case 'window':
                this.iconPath = new vscode.ThemeIcon('window');
                if (this.data.window?.active) {
                    this.description = '(active)';
                    this.iconPath = new vscode.ThemeIcon(
                        'symbol-event',
                        new vscode.ThemeColor('icon.foreground'),
                    );
                }
                break;

            case 'pane':
                this.iconPath = new vscode.ThemeIcon('terminal');
                if (this.data.pane) {
                    this.description = this.data.pane.currentPath;
                    if (this.data.pane.currentCommand) {
                        this.tooltip = `Command: ${this.data.pane.currentCommand}\nPath: ${this.data.pane.currentPath}\nSize: ${this.data.pane.width}x${this.data.pane.height}`;
                    }
                    if (this.data.pane.active) {
                        this.iconPath = new vscode.ThemeIcon(
                            'terminal-view-icon',
                        );
                    }
                }
                break;

            case 'info':
                this.iconPath = new vscode.ThemeIcon('info');
                break;
        }
    }
}

/**
 * Tmux tree data provider
 */
export class TmuxTreeProvider implements vscode.TreeDataProvider<TmuxTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<
        TmuxTreeItem | undefined | null | undefined
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tmuxService: TmuxService;

    constructor(tmuxService: TmuxService) {
        this.tmuxService = tmuxService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TmuxTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TmuxTreeItem): Promise<TmuxTreeItem[]> {
        if (!element) {
            return this.getGroupNodes();
        }

        switch (element.data.type) {
            case 'group':
                if (element.data.group) {
                    return this.getSessionNodes(
                        element.data.connectionId,
                        element.data.group,
                    );
                }
                return [];

            case 'session':
                if (element.data.session) {
                    return this.getWindowNodes(element.data.session);
                }
                return [];

            case 'window':
                if (element.data.window) {
                    return this.getPaneNodes(element.data.window);
                }
                return [];

            default:
                return [];
        }
    }

    private getGroupNodes(): TmuxTreeItem[] {
        const localNode = new TmuxTreeItem(
            'Local',
            vscode.TreeItemCollapsibleState.Expanded,
            {
                type: 'group',
                connectionId: 'local',
                group: 'local',
            },
        );
        localNode.contextValue = 'localConnection';

        const remoteNode = new TmuxTreeItem(
            'Remote',
            vscode.TreeItemCollapsibleState.Expanded,
            {
                type: 'group',
                connectionId: 'local',
                group: 'remote',
            },
        );
        remoteNode.contextValue = 'remoteConnection';

        return [localNode, remoteNode];
    }

    private isRemoteSession(name: string): boolean {
        return name.endsWith('-remote');
    }

    private async getSessionNodes(
        connectionId: string,
        group: SessionGroup,
    ): Promise<TmuxTreeItem[]> {
        try {
            const available =
                await this.tmuxService.isTmuxAvailable(connectionId);
            if (!available) {
                const node = new TmuxTreeItem(
                    'tmux is not installed or not available',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        type: 'info',
                        connectionId,
                    },
                );
                node.iconPath = new vscode.ThemeIcon('warning');
                return [node];
            }

            const allSessions =
                await this.tmuxService.listSessions(connectionId);

            let sessions = allSessions.filter((s) =>
                group === 'remote'
                    ? this.isRemoteSession(s.name)
                    : !this.isRemoteSession(s.name),
            );

            if (sessions.length === 0) {
                const node = new TmuxTreeItem(
                    'No active sessions',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        type: 'info',
                        connectionId,
                    },
                );
                node.iconPath = new vscode.ThemeIcon('info');
                return [node];
            }

            sessions = sessions.sort((a, b) => a.name.localeCompare(b.name));

            return sessions.map((session) => {
                const node = new TmuxTreeItem(
                    session.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    {
                        type: 'session',
                        connectionId,
                        session,
                    },
                );

                node.iconPath = session.attached
                    ? new vscode.ThemeIcon('folder-active')
                    : new vscode.ThemeIcon('folder');

                node.description = `${session.windowCount} windows`;
                if (session.attached) {
                    node.description += ` (${session.attachedCount} attached)`;
                }

                node.tooltip = `Session: ${session.name}\nWindows: ${session.windowCount}\nClients: ${session.attachedCount} attached\nStatus: ${session.attached ? 'attached' : 'detached'}`;

                return node;
            });
        } catch (error) {
            const node = new TmuxTreeItem(
                `Error: ${String(error)}`,
                vscode.TreeItemCollapsibleState.None,
                {
                    type: 'info',
                    connectionId,
                },
            );
            node.iconPath = new vscode.ThemeIcon('error');
            return [node];
        }
    }

    private async getWindowNodes(
        session: TmuxSession,
    ): Promise<TmuxTreeItem[]> {
        try {
            const windows = await this.tmuxService.listWindows(
                session.connectionId,
                session.name,
            );

            return windows.map((window) => {
                const label = `${window.index}: ${window.name}`;
                const node = new TmuxTreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    {
                        type: 'window',
                        connectionId: session.connectionId,
                        session,
                        window,
                    },
                );

                node.iconPath = window.active
                    ? new vscode.ThemeIcon(
                          'symbol-event',
                          new vscode.ThemeColor('icon.foreground'),
                      )
                    : new vscode.ThemeIcon('window');

                node.contextValue = window.active ? 'activeWindow' : 'window';

                if (window.active) {
                    node.description = '(active)';
                }

                node.tooltip = `Window: ${window.name}\nIndex: ${window.index}\nStatus: ${window.active ? 'active' : 'inactive'}`;

                return node;
            });
        } catch (error) {
            const node = new TmuxTreeItem(
                `Error: ${String(error)}`,
                vscode.TreeItemCollapsibleState.None,
                {
                    type: 'info',
                    connectionId: session.connectionId,
                },
            );
            node.iconPath = new vscode.ThemeIcon('error');
            return [node];
        }
    }

    private async getPaneNodes(window: TmuxWindow): Promise<TmuxTreeItem[]> {
        try {
            const panes = await this.tmuxService.listPanes(
                window.connectionId,
                window.sessionName,
                String(window.index),
            );

            return panes.map((pane) => {
                const label = `Pane ${pane.index}`;
                const node = new TmuxTreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        type: 'pane',
                        connectionId: window.connectionId,
                        window,
                        pane,
                    },
                );

                node.iconPath = pane.active
                    ? new vscode.ThemeIcon('terminal-view-icon')
                    : new vscode.ThemeIcon('terminal');

                node.contextValue = pane.active ? 'activePane' : 'pane';

                const pathParts = pane.currentPath.split('/');
                const shortPath =
                    pathParts.length > 2
                        ? `.../${pathParts.slice(-2).join('/')}`
                        : pane.currentPath;

                node.description = shortPath;

                if (pane.currentCommand) {
                    node.description = `${pane.currentCommand} (${shortPath})`;
                }

                const tooltipLines = [
                    `Pane: ${pane.id}`,
                    `Path: ${pane.currentPath}`,
                    pane.currentCommand
                        ? `Command: ${pane.currentCommand}`
                        : null,
                    `Size: ${pane.width}x${pane.height}`,
                    `Status: ${pane.active ? 'active' : 'inactive'}`,
                ];

                if (!pane.active) {
                    tooltipLines.push(
                        '',
                        'Double-click to switch to this pane',
                    );
                    node.command = {
                        command: 'superintent.tmux.selectPane',
                        title: 'Switch to Pane',
                        arguments: [
                            {
                                connectionId: window.connectionId,
                                paneId: pane.id,
                            },
                        ],
                    };
                }

                node.tooltip = tooltipLines
                    .filter((v) => v !== null)
                    .join('\n');

                return node;
            });
        } catch (error) {
            const node = new TmuxTreeItem(
                `Error: ${String(error)}`,
                vscode.TreeItemCollapsibleState.None,
                {
                    type: 'info',
                    connectionId: window.connectionId,
                },
            );
            node.iconPath = new vscode.ThemeIcon('error');
            return [node];
        }
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
