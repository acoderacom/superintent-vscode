export interface Knowledge {
    id: string;
    title: string;
    content?: string;
    namespace?: string;
    category?: string;
    source?: string;
    confidence?: number;
    decision_scope?: string;
    tags?: string[];
    author?: string;
    branch?: string;
    active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export type KnowledgeCategory = 'architecture' | 'pattern' | 'truth' | 'principle' | 'gotcha';

export type KnowledgeTreeItemType = 'category' | 'knowledge' | 'info';

export interface KnowledgeTreeNodeData {
    type: KnowledgeTreeItemType;
    category?: KnowledgeCategory;
    knowledge?: Knowledge;
}
