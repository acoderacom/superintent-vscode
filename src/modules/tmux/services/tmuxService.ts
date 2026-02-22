import type { TmuxPane, TmuxSession, TmuxWindow } from '../types';
import type { ConnectionManager } from './connectionManager';

/**
 * Tmux service - wraps all tmux operations
 */
export class TmuxService {
    private connectionManager: ConnectionManager;

    constructor(connectionManager: ConnectionManager) {
        this.connectionManager = connectionManager;
    }

    async isTmuxAvailable(connectionId: string): Promise<boolean> {
        try {
            const result = await this.connectionManager.execute(
                connectionId,
                'which tmux',
            );
            return result.exitCode === 0 && result.stdout.length > 0;
        } catch {
            return false;
        }
    }

    async listSessions(connectionId: string): Promise<TmuxSession[]> {
        const format =
            '#{session_id}:#{session_name}:#{session_attached}:#{session_windows}:#{session_created}';
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux list-sessions -F "${format}" 2>/dev/null`,
        );

        if (result.exitCode !== 0 || !result.stdout) {
            return [];
        }

        const sessions: TmuxSession[] = [];
        const lines = result.stdout.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length >= 4) {
                const session: TmuxSession = {
                    id: parts[0],
                    name: parts[1],
                    attached: parts[2] !== '0',
                    windowCount: Number.parseInt(parts[3], 10) || 0,
                    windows: [],
                    connectionId,
                };

                if (parts[4]) {
                    session.createdAt = new Date(
                        Number.parseInt(parts[4], 10) * 1000,
                    );
                }

                sessions.push(session);
            }
        }

        return sessions;
    }

    async listWindows(
        connectionId: string,
        sessionName: string,
    ): Promise<TmuxWindow[]> {
        const format =
            '#{window_id}:#{window_index}:#{window_name}:#{window_active}';
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux list-windows -t "${sessionName}" -F "${format}" 2>/dev/null`,
        );

        if (result.exitCode !== 0 || !result.stdout) {
            return [];
        }

        const windows: TmuxWindow[] = [];
        const lines = result.stdout.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length >= 4) {
                windows.push({
                    id: parts[0],
                    index: Number.parseInt(parts[1], 10) || 0,
                    name: parts[2],
                    active: parts[3] === '1',
                    panes: [],
                    sessionName,
                    connectionId,
                });
            }
        }

        return windows;
    }

    async listPanes(
        connectionId: string,
        sessionName: string,
        windowId: string,
    ): Promise<TmuxPane[]> {
        const format =
            '#{pane_id}:#{pane_index}:#{pane_active}:#{pane_current_path}:#{pane_current_command}:#{pane_width}:#{pane_height}';
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux list-panes -t "${sessionName}:${windowId}" -F "${format}" 2>/dev/null`,
        );

        if (result.exitCode !== 0 || !result.stdout) {
            return [];
        }

        const panes: TmuxPane[] = [];
        const lines = result.stdout.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length >= 7) {
                panes.push({
                    id: parts[0],
                    index: Number.parseInt(parts[1], 10) || 0,
                    active: parts[2] === '1',
                    currentPath: parts[3] || '~',
                    currentCommand: parts[4] || '',
                    width: Number.parseInt(parts[5], 10) || 0,
                    height: Number.parseInt(parts[6], 10) || 0,
                    windowId,
                    sessionName,
                    connectionId,
                });
            }
        }

        return panes;
    }

    async getSessionTree(connectionId: string): Promise<TmuxSession[]> {
        const sessions = await this.listSessions(connectionId);

        for (const session of sessions) {
            session.windows = await this.listWindows(
                connectionId,
                session.name,
            );

            for (const window of session.windows) {
                window.panes = await this.listPanes(
                    connectionId,
                    session.name,
                    String(window.index),
                );
            }
        }

        return sessions;
    }

    async createSession(
        connectionId: string,
        name?: string,
    ): Promise<TmuxSession | null> {
        let command = 'tmux new-session -d';
        if (name) {
            command += ` -s "${name}"`;
        }

        const result = await this.connectionManager.execute(
            connectionId,
            command,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to create session');
        }

        const sessions = await this.listSessions(connectionId);
        if (name) {
            return sessions.find((s) => s.name === name) || null;
        }
        return sessions[sessions.length - 1] || null;
    }

    async killSession(
        connectionId: string,
        sessionName: string,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux kill-session -t "${sessionName}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to kill session');
        }
    }

    async renameSession(
        connectionId: string,
        oldName: string,
        newName: string,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux rename-session -t "${oldName}" "${newName}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to rename session');
        }
    }

    async createWindow(
        connectionId: string,
        sessionName: string,
        windowName?: string,
    ): Promise<void> {
        let command = `tmux new-window -t "${sessionName}"`;
        if (windowName) {
            command += ` -n "${windowName}"`;
        }

        const result = await this.connectionManager.execute(
            connectionId,
            command,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to create window');
        }
    }

    async killWindow(
        connectionId: string,
        sessionName: string,
        windowIndex: number,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux kill-window -t "${sessionName}:${windowIndex}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to kill window');
        }
    }

    async renameWindow(
        connectionId: string,
        sessionName: string,
        windowIndex: number,
        newName: string,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux rename-window -t "${sessionName}:${windowIndex}" "${newName}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to rename window');
        }
    }

    async selectWindow(
        connectionId: string,
        sessionName: string,
        windowIndex: number,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux select-window -t "${sessionName}:${windowIndex}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to select window');
        }
    }

    async splitPaneHorizontal(
        connectionId: string,
        target: string,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux split-window -h -t "${target}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(
                result.stderr || 'Failed to split pane horizontally',
            );
        }
    }

    async splitPaneVertical(
        connectionId: string,
        target: string,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux split-window -v -t "${target}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to split pane vertically');
        }
    }

    async killPane(connectionId: string, paneId: string): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux kill-pane -t "${paneId}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to kill pane');
        }
    }

    async selectPane(connectionId: string, paneId: string): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux select-pane -t "${paneId}"`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to select pane');
        }
    }

    /**
     * Swap pane position.
     * direction: U (previous), D (next)
     */
    async swapPane(
        connectionId: string,
        paneId: string,
        direction: 'U' | 'D',
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux swap-pane -t "${paneId}" -${direction}`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to swap pane');
        }
    }

    /**
     * Resize pane.
     * direction: U (up), D (down), L (left), R (right)
     * amount: number of lines/columns to resize
     */
    async resizePane(
        connectionId: string,
        paneId: string,
        direction: 'U' | 'D' | 'L' | 'R',
        amount = 5,
    ): Promise<void> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux resize-pane -t "${paneId}" -${direction} ${amount}`,
        );

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Failed to resize pane');
        }
    }

    getAttachCommand(sessionName: string): string {
        return `tmux attach-session -t "${sessionName}"`;
    }

    async isMouseModeEnabled(connectionId: string): Promise<boolean> {
        const result = await this.connectionManager.execute(
            connectionId,
            `tmux show-options -g mouse 2>/dev/null | grep -q "on" && echo "enabled" || echo "disabled"`,
        );
        return result.stdout.trim() === 'enabled';
    }

    /**
     * Toggle mouse mode. Detects current state and switches, also modifies ~/.tmux.conf.
     */
    async toggleMouseMode(connectionId: string): Promise<boolean> {
        const isEnabled = await this.isMouseModeEnabled(connectionId);

        if (isEnabled) {
            await this.disableMouseMode(connectionId);
            return false;
        } else {
            await this.enableMouseMode(connectionId);
            return true;
        }
    }

    /**
     * Enable mouse mode. Modifies ~/.tmux.conf and reloads config.
     */
    async enableMouseMode(connectionId: string): Promise<void> {
        const checkResult = await this.connectionManager.execute(
            connectionId,
            `grep -q "^set.*-g.*mouse.*on" ~/.tmux.conf 2>/dev/null && echo "exists" || echo "not_exists"`,
        );

        if (checkResult.stdout.trim() === 'not_exists') {
            const addResult = await this.connectionManager.execute(
                connectionId,
                `echo "set -g mouse on" >> ~/.tmux.conf`,
            );

            if (addResult.exitCode !== 0) {
                throw new Error(addResult.stderr || 'Failed to add config');
            }
        }

        await this.connectionManager.execute(
            connectionId,
            `tmux source-file ~/.tmux.conf 2>/dev/null || true`,
        );

        await this.connectionManager.execute(
            connectionId,
            `tmux set-option -g mouse on 2>/dev/null || true`,
        );
    }

    async disableMouseMode(connectionId: string): Promise<void> {
        await this.connectionManager.execute(
            connectionId,
            `sed -i '/^set.*-g.*mouse.*on/d' ~/.tmux.conf 2>/dev/null || true`,
        );

        await this.connectionManager.execute(
            connectionId,
            `tmux set-option -g mouse off 2>/dev/null || true`,
        );
    }
}
