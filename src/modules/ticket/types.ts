export type TicketType =
    | 'feature'
    | 'bugfix'
    | 'refactor'
    | 'docs'
    | 'chore'
    | 'test';

export type TicketStatus =
    | 'Backlog'
    | 'In Progress'
    | 'In Review'
    | 'Done'
    | 'Blocked'
    | 'Paused'
    | 'Abandoned'
    | 'Superseded';

export interface TicketPlan {
    files: string[];
    taskSteps: { task: string; steps: string[]; done: boolean }[];
    dodVerification: { dod: string; verify: string; done: boolean }[];
    decisions: { choice: string; reason: string }[];
    tradeOffs: { considered: string; rejected: string }[];
    rollback?: {
        steps: string[];
        reversibility: 'full' | 'partial' | 'none';
    };
    irreversibleActions: string[];
    edgeCases: string[];
}

export interface Ticket {
    id: string;
    type?: TicketType;
    title?: string;
    status: TicketStatus;
    intent: string;
    context?: string;
    constraints_use?: string[];
    constraints_avoid?: string[];
    assumptions?: string[];
    change_class?: 'A' | 'B' | 'C';
    change_class_reason?: string;
    plan?: TicketPlan;
    origin_spec_id?: string;
    derived_knowledge?: string[];
    author?: string;
    created_at?: string;
    updated_at?: string;
}

export type TicketTreeItemType = 'ticket' | 'category' | 'group' | 'info';

export interface TicketTreeNodeData {
    type: TicketTreeItemType;
    ticket?: Ticket;
    status?: TicketStatus;
}
