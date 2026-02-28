import * as vscode from 'vscode';
import { SYSTEM_ACTIONS } from './types';

export function registerCommands(context: vscode.ExtensionContext): void {
    for (const action of SYSTEM_ACTIONS) {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                `superintent.system.${action.id}`,
                () => {
                    const terminal = vscode.window.createTerminal({
                        name: action.terminalName,
                    });
                    terminal.sendText(action.command);
                    terminal.show();
                },
            ),
        );
    }
}
