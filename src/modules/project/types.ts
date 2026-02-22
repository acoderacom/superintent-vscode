export interface Project {
    id: string;
    name: string;
    path: string;
    order: number;
}

export interface ProjectCategory {
    id: string;
    name: string;
    order: number;
    projects: Project[];
}

export type ProjectTreeItemType = 'project' | 'category' | 'info';

export interface ProjectTreeNodeData {
    type: ProjectTreeItemType;
    category?: ProjectCategory;
    project?: Project;
    categoryId?: string;
}
