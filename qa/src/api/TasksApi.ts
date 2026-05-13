import { BaseApiClient } from './BaseApiClient';
import { Task, TaskCreatePayload } from './types';

export class TasksApi extends BaseApiClient {
  async listForProject(projectId: number): Promise<Task[]> {
    return this.get<Task[]>(`/projects/${projectId}/tasks`);
  }

  async create(projectId: number, payload: TaskCreatePayload): Promise<Task> {
    return this.put<Task>(`/projects/${projectId}/tasks`, payload);
  }

  async update(id: number, payload: Partial<Task>): Promise<Task> {
    return this.post<Task>(`/tasks/${id}`, payload);
  }

  async remove(id: number): Promise<void> {
    await this.delete<void>(`/tasks/${id}`);
  }

  async markDone(id: number, done = true): Promise<Task> {
    return this.update(id, { done });
  }
}
