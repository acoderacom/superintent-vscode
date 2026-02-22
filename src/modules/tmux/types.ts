/**
 * Tmux pane
 */
export interface TmuxPane {
    id: string;
    index: number;
    active: boolean;
    currentPath: string;
    currentCommand: string;
    width: number;
    height: number;
    windowId: string;
    sessionName: string;
    connectionId: string;
}

/**
 * Tmux window
 */
export interface TmuxWindow {
    id: string;
    index: number;
    name: string;
    active: boolean;
    panes: TmuxPane[];
    sessionName: string;
    connectionId: string;
}

/**
 * Tmux session
 */
export interface TmuxSession {
    id: string;
    name: string;
    attached: boolean;
    attachedCount: number;
    windows: TmuxWindow[];
    windowCount: number;
    createdAt?: Date;
    connectionId: string;
}

/**
 * Command execution result
 */
export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Session group type
 */
export type SessionGroup = 'local' | 'remote';

/**
 * Tree item type
 */
export type TreeItemType =
    | 'group'
    | 'session'
    | 'window'
    | 'pane'
    | 'info';

/**
 * Tree node data
 */
export interface TreeNodeData {
    type: TreeItemType;
    connectionId: string;
    group?: SessionGroup;
    session?: TmuxSession;
    window?: TmuxWindow;
    pane?: TmuxPane;
}
