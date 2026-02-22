# Superintent VSCode

AI-powered development companion — manage tmux sessions, track tickets, specs, and knowledge from your sidebar.

## Features

### Tmux Management
- **Visual session control** — Create, rename, delete sessions/windows/panes via context menus
- **Local & Remote grouping** — Sessions auto-categorized by naming convention (`-remote` suffix)
- **Split & resize panes** — Horizontal/vertical splits and size adjustments
- **Status bar integration** — See active session at a glance
- **Mouse mode toggle** — Enable/disable mouse scrolling with one click

### Tickets
- **Kanban-style tree view** — Backlog, In Progress, In Review, Done
- **Drag and drop** — Move tickets between statuses
- **Rich preview** — View full ticket details in a webview panel

### Knowledge
- **Categorized entries** — Architecture, patterns, truths, principles, gotchas
- **Active/inactive tracking** — Deactivated knowledge sorted to end of list

### Specs
- **Feature specs** — Track and preview specs from your sidebar

## Requirements

- `tmux` installed on local machine
- Superintent server running for tickets, knowledge, and specs

## Quick Start

1. Click the Superintent icon in the activity bar
2. **Tmux** — Expand Local/Remote groups to manage sessions
3. **Tickets/Knowledge/Specs** — Configure server URL in settings, data syncs via SSE
4. Right-click on any item for available actions

## License

[MIT](LICENSE)
