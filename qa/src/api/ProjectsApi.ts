import { BaseApiClient } from './BaseApiClient';
import { Project, ProjectCreatePayload, ProjectUpdatePayload } from './types';

export class ProjectsApi extends BaseApiClient {
  async list(): Promise<Project[]> {
    return this.get<Project[]>('/projects');
  }

  async getById(id: number): Promise<Project> {
    return this.get<Project>(`/projects/${id}`);
  }

  async create(payload: ProjectCreatePayload): Promise<Project> {
    return this.put<Project>('/projects', payload);
  }

  async update(id: number, payload: ProjectUpdatePayload): Promise<Project> {
    return this.post<Project>(`/projects/${id}`, payload);
  }

  async remove(id: number): Promise<void> {
    await this.delete<void>(`/projects/${id}`);
  }

  async findByTitle(title: string): Promise<Project | undefined> {
    const all = await this.list();
    return all.find((p) => p.title === title);
  }
}
