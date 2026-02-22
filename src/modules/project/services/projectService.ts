import * as crypto from 'node:crypto';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import type { Project, ProjectCategory } from '../types';

const STORAGE_KEY = 'superintent.projects';

export class ProjectService {
    constructor(private readonly context: vscode.ExtensionContext) {}

    getCategories(): ProjectCategory[] {
        const data = this.context.globalState.get<ProjectCategory[]>(
            STORAGE_KEY,
            [],
        );
        return [...data].sort((a, b) => a.order - b.order);
    }

    async saveCategories(categories: ProjectCategory[]): Promise<void> {
        await this.context.globalState.update(STORAGE_KEY, categories);
    }

    async addCategory(name: string): Promise<ProjectCategory> {
        const categories = this.getCategories();
        const maxOrder = categories.reduce(
            (max, c) => Math.max(max, c.order),
            -1,
        );
        const category: ProjectCategory = {
            id: crypto.randomUUID(),
            name,
            order: maxOrder + 1,
            projects: [],
        };
        categories.push(category);
        await this.saveCategories(categories);
        return category;
    }

    async renameCategory(id: string, name: string): Promise<void> {
        const categories = this.getCategories();
        const category = categories.find((c) => c.id === id);
        if (category) {
            category.name = name;
            await this.saveCategories(categories);
        }
    }

    async deleteCategory(id: string): Promise<void> {
        const categories = this.getCategories().filter((c) => c.id !== id);
        await this.saveCategories(categories);
    }

    async addProject(
        categoryId: string,
        folderPath: string,
        name?: string,
    ): Promise<Project> {
        const categories = this.getCategories();
        const category = categories.find((c) => c.id === categoryId);
        if (!category) {
            throw new Error(`Category not found: ${categoryId}`);
        }
        const maxOrder = category.projects.reduce(
            (max, p) => Math.max(max, p.order),
            -1,
        );
        const project: Project = {
            id: crypto.randomUUID(),
            name: name || path.basename(folderPath),
            path: folderPath,
            order: maxOrder + 1,
        };
        category.projects.push(project);
        await this.saveCategories(categories);
        return project;
    }

    async renameProject(
        categoryId: string,
        projectId: string,
        name: string,
    ): Promise<void> {
        const categories = this.getCategories();
        const category = categories.find((c) => c.id === categoryId);
        const project = category?.projects.find((p) => p.id === projectId);
        if (project) {
            project.name = name;
            await this.saveCategories(categories);
        }
    }

    async deleteProject(categoryId: string, projectId: string): Promise<void> {
        const categories = this.getCategories();
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
            category.projects = category.projects.filter(
                (p) => p.id !== projectId,
            );
            await this.saveCategories(categories);
        }
    }

    async moveProject(
        projectId: string,
        fromCategoryId: string,
        toCategoryId: string,
        newOrder: number,
    ): Promise<void> {
        const categories = this.getCategories();
        const fromCategory = categories.find((c) => c.id === fromCategoryId);
        const toCategory = categories.find((c) => c.id === toCategoryId);
        if (!fromCategory || !toCategory) {
            return;
        }

        const projectIndex = fromCategory.projects.findIndex(
            (p) => p.id === projectId,
        );
        if (projectIndex === -1) {
            return;
        }

        const [project] = fromCategory.projects.splice(projectIndex, 1);
        project.order = newOrder;
        toCategory.projects.push(project);
        this.recomputeOrders(toCategory.projects);
        this.recomputeOrders(fromCategory.projects);
        await this.saveCategories(categories);
    }

    async reorderProject(
        categoryId: string,
        projectId: string,
        newOrder: number,
    ): Promise<void> {
        const categories = this.getCategories();
        const category = categories.find((c) => c.id === categoryId);
        if (!category) {
            return;
        }

        const project = category.projects.find((p) => p.id === projectId);
        if (!project) {
            return;
        }

        project.order = newOrder;
        this.recomputeOrders(category.projects);
        await this.saveCategories(categories);
    }

    async reorderCategory(categoryId: string, newOrder: number): Promise<void> {
        const categories = this.getCategories();
        const category = categories.find((c) => c.id === categoryId);
        if (!category) {
            return;
        }

        category.order = newOrder;
        this.recomputeCategories(categories);
        await this.saveCategories(categories);
    }

    private recomputeOrders(projects: Project[]): void {
        projects.sort((a, b) => a.order - b.order);
        for (let i = 0; i < projects.length; i++) {
            projects[i].order = i;
        }
    }

    private recomputeCategories(categories: ProjectCategory[]): void {
        categories.sort((a, b) => a.order - b.order);
        for (let i = 0; i < categories.length; i++) {
            categories[i].order = i;
        }
    }
}
