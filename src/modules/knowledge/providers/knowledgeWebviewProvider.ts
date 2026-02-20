import * as vscode from 'vscode';
import type { KnowledgeService } from '../services/knowledgeService';
import type { Knowledge } from '../types';

export class KnowledgeWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private knowledgeService: KnowledgeService;
    private cache = new Map<string, Knowledge>();

    constructor(knowledgeService: KnowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    clearCache(): void {
        this.cache.clear();
    }

    async show(knowledgeId: string): Promise<void> {
        let knowledge = this.cache.get(knowledgeId);
        if (!knowledge) {
            knowledge = await this.knowledgeService.getKnowledge(knowledgeId);
            this.cache.set(knowledgeId, knowledge);
        }
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.panel.title = knowledge.title;
            this.panel.webview.html = this.buildHtml(knowledge);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'superintent.knowledge.view',
            knowledge.title,
            vscode.ViewColumn.One,
            { enableScripts: false },
        );

        this.panel.webview.html = this.buildHtml(knowledge);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private buildHtml(knowledge: Knowledge): string {
        const meta = this.buildMeta(knowledge);
        const body = this.markdownToHtml(knowledge.content || '');

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
    .badge {
        display: inline-block;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8em;
        font-weight: 600;
    }
    .content h1, .content h2, .content h3,
    .content h4, .content h5, .content h6 {
        color: var(--vscode-foreground);
        margin-top: 1.4em;
        margin-bottom: 0.6em;
    }
    .content h1 { font-size: 1.5em; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 6px; }
    .content h2 { font-size: 1.3em; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 4px; }
    .content h3 { font-size: 1.1em; }
    .content p { margin: 0.8em 0; }
    .content ul, .content ol { padding-left: 24px; margin: 0.6em 0; }
    .content li { margin: 0.3em 0; }
    .content code {
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
        background: var(--vscode-textCodeBlock-background);
        padding: 2px 5px;
        border-radius: 3px;
    }
    .content pre {
        background: var(--vscode-textCodeBlock-background);
        padding: 12px 16px;
        border-radius: 4px;
        overflow-x: auto;
    }
    .content pre code {
        background: none;
        padding: 0;
    }
    .content blockquote {
        border-left: 3px solid var(--vscode-textBlockQuote-border);
        margin: 0.8em 0;
        padding: 4px 16px;
        color: var(--vscode-descriptionForeground);
    }
    .content hr {
        border: none;
        border-top: 1px solid var(--vscode-widget-border);
        margin: 1.5em 0;
    }
    .content table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.8em 0;
    }
    .content th, .content td {
        border: 1px solid var(--vscode-widget-border);
        padding: 6px 12px;
        text-align: left;
    }
    .content th {
        background: var(--vscode-textCodeBlock-background);
        font-weight: 600;
    }
    .empty {
        color: var(--vscode-descriptionForeground);
        font-style: italic;
        margin-top: 24px;
    }
</style>
</head>
<body>
    <div class="meta">
        <h1>${this.escapeHtml(knowledge.title)}</h1>
        ${meta}
    </div>
    <div class="content">
        ${body || '<p class="empty">No content</p>'}
    </div>
</body>
</html>`;
    }

    private buildMeta(k: Knowledge): string {
        const row1: string[] = [];
        row1.push(`<span>ID: ${this.escapeHtml(k.id)}</span>`);
        if (k.category) {
            row1.push(
                `<span>Category: <span class="badge">${this.escapeHtml(k.category)}</span></span>`,
            );
        }
        if (k.confidence != null) {
            row1.push(`<span>Confidence: ${k.confidence}</span>`);
        }
        if (k.decision_scope) {
            row1.push(
                `<span>Scope: ${this.escapeHtml(k.decision_scope)}</span>`,
            );
        }

        const row2: string[] = [];
        if (k.namespace) {
            row2.push(
                `<span>Namespace: ${this.escapeHtml(k.namespace)}</span>`,
            );
        }
        if (k.source) {
            row2.push(`<span>Source: ${this.escapeHtml(k.source)}</span>`);
        }
        if (k.author) {
            row2.push(`<span>Author: ${this.escapeHtml(k.author)}</span>`);
        }
        if (k.branch) {
            row2.push(`<span>Branch: ${this.escapeHtml(k.branch)}</span>`);
        }
        if (k.created_at) {
            row2.push(`<span>Created: ${this.escapeHtml(k.created_at)}</span>`);
        }
        if (k.updated_at) {
            row2.push(`<span>Updated: ${this.escapeHtml(k.updated_at)}</span>`);
        }

        let html = `<div class="meta-row">${row1.join('')}</div>`;
        if (row2.length > 0) {
            html += `<div class="meta-row">${row2.join('')}</div>`;
        }

        if (k.tags?.length) {
            const tagHtml = k.tags
                .map((t) => `<span class="tag">${this.escapeHtml(t)}</span>`)
                .join('');
            html += `<div class="tags">${tagHtml}</div>`;
        }

        return html;
    }

    private markdownToHtml(md: string): string {
        let html = this.escapeHtml(md);

        // Code blocks
        html = html.replace(
            /```(\w*)\n([\s\S]*?)```/g,
            (_m, _lang, code) => `<pre><code>${code.trimEnd()}</code></pre>`,
        );

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Tables
        html = html.replace(
            /^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)*)/gm,
            (_m, header, _sep, body) => {
                const thCells = (header as string)
                    .split('|')
                    .filter((c: string) => c.trim())
                    .map((c: string) => `<th>${c.trim()}</th>`)
                    .join('');
                const rows = (body as string)
                    .trim()
                    .split('\n')
                    .map((row: string) => {
                        const cells = row
                            .split('|')
                            .filter((c: string) => c.trim())
                            .map((c: string) => `<td>${c.trim()}</td>`)
                            .join('');
                        return `<tr>${cells}</tr>`;
                    })
                    .join('');
                return `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
            },
        );

        // Headings
        html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

        // Horizontal rules
        html = html.replace(/^---+$/gm, '<hr>');

        // Blockquotes
        html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

        // Bold and italic
        html = html.replace(
            /\*\*\*(.+?)\*\*\*/g,
            '<strong><em>$1</em></strong>',
        );
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Unordered lists
        html = html.replace(/((?:^[-*]\s+.+\n?)+)/gm, (block) => {
            const items = block
                .trim()
                .split('\n')
                .map((line) => `<li>${line.replace(/^[-*]\s+/, '')}</li>`)
                .join('');
            return `<ul>${items}</ul>`;
        });

        // Ordered lists
        html = html.replace(/((?:^\d+\.\s+.+\n?)+)/gm, (block) => {
            const items = block
                .trim()
                .split('\n')
                .map((line) => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
                .join('');
            return `<ol>${items}</ol>`;
        });

        // Paragraphs
        html = html.replace(/^(?!<[a-z])((?!<\/)[^\n]+)$/gm, '<p>$1</p>');

        // Clean up
        html = html.replace(/\n{3,}/g, '\n\n');

        return html;
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
