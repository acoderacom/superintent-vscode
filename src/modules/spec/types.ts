export interface Spec {
    id: string;
    title: string;
    content?: string;
    author?: string;
    created_at?: string;
    updated_at?: string;
}

export type SpecTreeItemType = 'spec' | 'info';

export interface SpecTreeNodeData {
    type: SpecTreeItemType;
    spec?: Spec;
}
