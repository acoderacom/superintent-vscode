import * as vscode from 'vscode';
import { SYSTEM_ACTIONS, type SystemAction } from '../types';

export class SystemTreeItem extends vscode.TreeItem {
    public readonly action: SystemAction;

    constructor(action: SystemAction) {
        super(action.label, vscode.TreeItemCollapsibleState.None);
        this.action = action;
        this.iconPath = new vscode.ThemeIcon(action.icon);
        this.command = {
            command: `superintent.system.${action.id}`,
            title: action.label,
        };
    }
}

export class SystemTreeProvider
    implements vscode.TreeDataProvider<SystemTreeItem>
{
    getTreeItem(element: SystemTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): SystemTreeItem[] {
        return SYSTEM_ACTIONS.map((action) => new SystemTreeItem(action));
    }
}
