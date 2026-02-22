# Superintent VSCode

VScode extension for Superintent. Manage projects, tmux sessions, track specs, ticket, and knowledge from your sidebar.

## Features

### Projects
- **Folder-based projects** — Add any folder as a project via native folder dialog
- **Custom categories** — Create, rename, and delete categories to organize projects
- **Drag and drop** — Move projects between categories and reorder within them
- **Open in New Window** — Right-click to launch a project in a new VS Code window
- **Local persistence** — Data stored in VS Code globalState, no server needed

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

- `tmux` installed on local machine (for tmux features)
- Superintent server running for tickets, knowledge, and specs

## Quick Start

1. Click the Superintent icon in the activity bar
2. **Projects** — Click `+` to create a category, then right-click to add project folders
3. **Tmux** — Expand Local/Remote groups to manage sessions
4. **Tickets/Knowledge/Specs** — Configure server URL in settings, data syncs via SSE
5. Right-click on any item for available actions

## License

[MIT](LICENSE)
