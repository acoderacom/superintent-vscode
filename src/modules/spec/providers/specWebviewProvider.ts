import * as vscode from 'vscode';
import type { SpecService } from '../services/specService';
import type { Spec } from '../types';

export class SpecWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private specService: SpecService;
    private cache = new Map<string, Spec>();

    constructor(specService: SpecService) {
        this.specService = specService;
    }

    clearCache(): void {
        this.cache.clear();
    }

    async show(specId: string): Promise<void> {
        let spec = this.cache.get(specId);
        if (!spec) {
            spec = await this.specService.getSpec(specId);
            this.cache.set(specId, spec);
        }

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.panel.title = spec.title;
            this.panel.webview.html = this.buildHtml(spec);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'superintent.spec.view',
            spec.title,
            vscode.ViewColumn.One,
            { enableScripts: false },
        );

        this.panel.webview.html = this.buildHtml(spec);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private buildHtml(spec: Spec): string {
        const meta = this.buildMeta(spec);
        const body = this.markdownToHtml(spec.content || '');

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
    }
    .meta-row span {
        display: flex;
        align-items: center;
        gap: 4px;
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
        <h1>${this.escapeHtml(spec.title)}</h1>
        ${meta}
    </div>
    <div class="content">
        ${body || '<p class="empty">No content</p>'}
    </div>
</body>
</html>`;
    }

    private buildMeta(spec: Spec): string {
        const items: string[] = [];
        items.push(`<span>ID: ${this.escapeHtml(spec.id)}</span>`);
        if (spec.author) {
            items.push(`<span>Author: ${this.escapeHtml(spec.author)}</span>`);
        }
        if (spec.created_at) {
            items.push(
                `<span>Created: ${this.escapeHtml(spec.created_at)}</span>`,
            );
        }
        if (spec.updated_at) {
            items.push(
                `<span>Updated: ${this.escapeHtml(spec.updated_at)}</span>`,
            );
        }
        return `<div class="meta-row">${items.join('')}</div>`;
    }

    private markdownToHtml(md: string): string {
        let html = this.escapeHtml(md);

        // Code blocks (``` ... ```)
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
                .map((line) => {
                    return `<li>${line.replace(/^[-*]\s+/, '')}</li>`;
                })
                .join('');
            return `<ul>${items}</ul>`;
        });

        // Ordered lists
        html = html.replace(/((?:^\d+\.\s+.+\n?)+)/gm, (block) => {
            const items = block
                .trim()
                .split('\n')
                .map((line) => {
                    return `<li>${line.replace(/^\d+\.\s+/, '')}</li>`;
                })
                .join('');
            return `<ol>${items}</ol>`;
        });

        // Paragraphs: wrap remaining loose lines
        html = html.replace(/^(?!<[a-z])((?!<\/)[^\n]+)$/gm, '<p>$1</p>');

        // Clean up extra blank lines
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
