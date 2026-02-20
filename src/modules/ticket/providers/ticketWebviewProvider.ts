import * as vscode from 'vscode';
import type { TicketService } from '../services/ticketService';
import type { Ticket, TicketPlan } from '../types';

export class TicketWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private ticketService: TicketService;
    private cache = new Map<string, Ticket>();

    constructor(ticketService: TicketService) {
        this.ticketService = ticketService;
    }

    clearCache(): void {
        this.cache.clear();
    }

    async show(ticketId: string): Promise<void> {
        let ticket = this.cache.get(ticketId);
        if (!ticket) {
            ticket = await this.ticketService.getTicket(ticketId);
            this.cache.set(ticketId, ticket);
        }

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.panel.title = ticket.title || ticket.intent;
            this.panel.webview.html = this.buildHtml(ticket);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'superintent.ticket.view',
            ticket.title || ticket.intent,
            vscode.ViewColumn.One,
            { enableScripts: false },
        );

        this.panel.webview.html = this.buildHtml(ticket);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private buildHtml(ticket: Ticket): string {
        const meta = this.buildMeta(ticket);
        const body = this.buildBody(ticket);

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        line-height: 1.6;
        max-width: 860px;
        margin: 0 auto;
        padding: 24px 32px;
    }
    .meta {
        border-bottom: 1px solid var(--vscode-widget-border);
        padding-bottom: 16px;
        margin-bottom: 24px;
    }
    .meta h1 {
        margin: 0 0 12px 0;
        font-size: 1.6em;
        color: var(--vscode-foreground);
    }
    .meta-row {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        font-size: 0.85em;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
    }
    .meta-row span {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .badge {
        display: inline-block;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8em;
        font-weight: 600;
    }
    .tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
    }
    .tag {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8em;
    }
    section {
        margin-bottom: 24px;
    }
    section h2 {
        font-size: 1.2em;
        color: var(--vscode-foreground);
        margin: 0 0 8px 0;
        border-bottom: 1px solid var(--vscode-widget-border);
        padding-bottom: 4px;
    }
    section h3 {
        font-size: 1.05em;
        color: var(--vscode-foreground);
        margin: 16px 0 6px 0;
    }
    section p {
        margin: 0.5em 0;
    }
    ul, ol {
        padding-left: 24px;
        margin: 0.4em 0;
    }
    li { margin: 0.25em 0; }
    .checklist {
        list-style: none;
        padding-left: 0;
    }
    .checklist li::before {
        content: '';
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 1px solid var(--vscode-descriptionForeground);
        border-radius: 3px;
        margin-right: 8px;
        vertical-align: middle;
    }
    .checklist li.done::before {
        background: var(--vscode-charts-green);
        border-color: var(--vscode-charts-green);
    }
    .checklist li.done {
        color: var(--vscode-descriptionForeground);
        text-decoration: line-through;
    }
    .file-list {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    .file-tag {
        font-family: var(--vscode-editor-font-family);
        font-size: 0.85em;
        background: var(--vscode-textCodeBlock-background);
        padding: 2px 8px;
        border-radius: 3px;
    }
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.6em 0;
    }
    th, td {
        border: 1px solid var(--vscode-widget-border);
        padding: 6px 12px;
        text-align: left;
    }
    th {
        background: var(--vscode-textCodeBlock-background);
        font-weight: 600;
    }
    .empty {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
    }
    code {
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
        background: var(--vscode-textCodeBlock-background);
        padding: 2px 5px;
        border-radius: 3px;
    }
</style>
</head>
<body>
    <div class="meta">
        <h1>${this.escapeHtml(ticket.title || ticket.intent)}</h1>
        ${meta}
    </div>
    ${body}
</body>
</html>`;
    }

    private buildMeta(t: Ticket): string {
        const row1: string[] = [];
        row1.push(`<span>ID: ${this.escapeHtml(t.id)}</span>`);
        row1.push(
            `<span>Status: <span class="badge">${this.escapeHtml(t.status)}</span></span>`,
        );
        if (t.type) {
            row1.push(
                `<span>Type: <span class="badge">${this.escapeHtml(t.type)}</span></span>`,
            );
        }
        if (t.change_class) {
            row1.push(
                `<span>Class: <span class="badge">${this.escapeHtml(t.change_class)}</span></span>`,
            );
        }

        const row2: string[] = [];
        if (t.author) {
            row2.push(`<span>Author: ${this.escapeHtml(t.author)}</span>`);
        }
        if (t.origin_spec_id) {
            row2.push(
                `<span>Spec: ${this.escapeHtml(t.origin_spec_id)}</span>`,
            );
        }
        if (t.created_at) {
            row2.push(`<span>Created: ${this.escapeHtml(t.created_at)}</span>`);
        }
        if (t.updated_at) {
            row2.push(`<span>Updated: ${this.escapeHtml(t.updated_at)}</span>`);
        }

        let html = `<div class="meta-row">${row1.join('')}</div>`;
        if (row2.length > 0) {
            html += `<div class="meta-row">${row2.join('')}</div>`;
        }

        if (t.derived_knowledge?.length) {
            const tagHtml = t.derived_knowledge
                .map((k) => `<span class="tag">${this.escapeHtml(k)}</span>`)
                .join('');
            html += `<div class="tags">${tagHtml}</div>`;
        }

        return html;
    }

    private buildBody(t: Ticket): string {
        const sections: string[] = [];

        // Intent
        if (t.title && t.intent) {
            sections.push(
                `<section><h2>Intent</h2><p>${this.escapeHtml(t.intent)}</p></section>`,
            );
        }

        // Context
        if (t.context) {
            sections.push(
                `<section><h2>Context</h2><p>${this.escapeHtml(t.context)}</p></section>`,
            );
        }

        // Change class reason
        if (t.change_class_reason) {
            sections.push(
                `<section><h2>Change Class Reason</h2><p>${this.escapeHtml(t.change_class_reason)}</p></section>`,
            );
        }

        // Constraints
        if (t.constraints_use?.length || t.constraints_avoid?.length) {
            let constraintHtml = '<section><h2>Constraints</h2>';
            if (t.constraints_use?.length) {
                constraintHtml += '<h3>Use</h3><ul>';
                for (const c of t.constraints_use) {
                    constraintHtml += `<li>${this.escapeHtml(c)}</li>`;
                }
                constraintHtml += '</ul>';
            }
            if (t.constraints_avoid?.length) {
                constraintHtml += '<h3>Avoid</h3><ul>';
                for (const c of t.constraints_avoid) {
                    constraintHtml += `<li>${this.escapeHtml(c)}</li>`;
                }
                constraintHtml += '</ul>';
            }
            constraintHtml += '</section>';
            sections.push(constraintHtml);
        }

        // Assumptions
        if (t.assumptions?.length) {
            let html = '<section><h2>Assumptions</h2><ul>';
            for (const a of t.assumptions) {
                html += `<li>${this.escapeHtml(a)}</li>`;
            }
            html += '</ul></section>';
            sections.push(html);
        }

        // Plan
        if (t.plan) {
            sections.push(this.buildPlanHtml(t.plan));
        }

        if (sections.length === 0) {
            return '<p class="empty">No details</p>';
        }

        return sections.join('');
    }

    private buildPlanHtml(plan: TicketPlan): string {
        const parts: string[] = ['<section><h2>Plan</h2>'];

        // Files
        if (plan.files?.length) {
            parts.push('<h3>Files</h3><div class="file-list">');
            for (const f of plan.files) {
                parts.push(
                    `<span class="file-tag">${this.escapeHtml(f)}</span>`,
                );
            }
            parts.push('</div>');
        }

        // Task steps
        if (plan.taskSteps?.length) {
            parts.push('<h3>Tasks</h3>');
            for (const task of plan.taskSteps) {
                parts.push(
                    `<p><strong>${task.done ? '&#10003; ' : ''}${this.escapeHtml(task.task)}</strong></p>`,
                );
                if (task.steps?.length) {
                    parts.push('<ul>');
                    for (const step of task.steps) {
                        parts.push(`<li>${this.escapeHtml(step)}</li>`);
                    }
                    parts.push('</ul>');
                }
            }
        }

        // DoD verification
        if (plan.dodVerification?.length) {
            parts.push('<h3>Definition of Done</h3><ul class="checklist">');
            for (const dod of plan.dodVerification) {
                const cls = dod.done ? ' class="done"' : '';
                parts.push(
                    `<li${cls}><strong>${this.escapeHtml(dod.dod)}</strong> — ${this.escapeHtml(dod.verify)}</li>`,
                );
            }
            parts.push('</ul>');
        }

        // Decisions
        if (plan.decisions?.length) {
            parts.push(
                '<h3>Decisions</h3><table><thead><tr><th>Choice</th><th>Reason</th></tr></thead><tbody>',
            );
            for (const d of plan.decisions) {
                parts.push(
                    `<tr><td>${this.escapeHtml(d.choice)}</td><td>${this.escapeHtml(d.reason)}</td></tr>`,
                );
            }
            parts.push('</tbody></table>');
        }

        // Trade-offs
        if (plan.tradeOffs?.length) {
            parts.push(
                '<h3>Trade-offs</h3><table><thead><tr><th>Considered</th><th>Rejected Because</th></tr></thead><tbody>',
            );
            for (const t of plan.tradeOffs) {
                parts.push(
                    `<tr><td>${this.escapeHtml(t.considered)}</td><td>${this.escapeHtml(t.rejected)}</td></tr>`,
                );
            }
            parts.push('</tbody></table>');
        }

        // Rollback
        if (plan.rollback) {
            parts.push(
                `<h3>Rollback</h3><p>Reversibility: <span class="badge">${this.escapeHtml(plan.rollback.reversibility)}</span></p>`,
            );
            if (plan.rollback.steps?.length) {
                parts.push('<ul>');
                for (const s of plan.rollback.steps) {
                    parts.push(`<li>${this.escapeHtml(s)}</li>`);
                }
                parts.push('</ul>');
            }
        }

        // Irreversible actions
        if (plan.irreversibleActions?.length) {
            parts.push('<h3>Irreversible Actions</h3><ul>');
            for (const a of plan.irreversibleActions) {
                parts.push(`<li>${this.escapeHtml(a)}</li>`);
            }
            parts.push('</ul>');
        }

        // Edge cases
        if (plan.edgeCases?.length) {
            parts.push('<h3>Edge Cases</h3><ul>');
            for (const e of plan.edgeCases) {
                parts.push(`<li>${this.escapeHtml(e)}</li>`);
            }
            parts.push('</ul>');
        }

        parts.push('</section>');
        return parts.join('');
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    dispose(): void {
        this.panel?.dispose();
    }
}
