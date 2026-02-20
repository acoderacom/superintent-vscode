import * as vscode from 'vscode';

/**
 * Status bar provider - shows active tmux session info
 */
export class StatusBarProvider {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {

        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100,
        );
        this.statusBarItem.command = 'superintent.tmux.quickAttach';
        this.statusBarItem.tooltip = 'Click to attach session to terminal';
    }

    show(): void {
        this.statusBarItem.text = '$(terminal) tmux';
        this.statusBarItem.show();
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
