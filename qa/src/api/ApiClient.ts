import { APIRequestContext } from '@playwright/test';
import { UsersApi } from './UsersApi';
import { ProjectsApi } from './ProjectsApi';
import { TasksApi } from './TasksApi';
import { AuthToken } from './types';

export interface ApiClientFacadeOptions {
  baseUrl: string;
  token?: string;
  context?: APIRequestContext;
}

/**
 * Facade that composes the resource-specific API clients and keeps their
 * authentication token in sync. Tests typically interact with this object,
 * but can still reach the underlying clients for fine-grained calls.
 */
export class ApiClient {
  readonly users: UsersApi;
  readonly projects: ProjectsApi;
  readonly tasks: TasksApi;

  constructor(opts: ApiClientFacadeOptions) {
    this.users = new UsersApi(opts);
    this.projects = new ProjectsApi(opts);
    this.tasks = new TasksApi(opts);
  }

  setToken(token: string | undefined): void {
    this.users.setToken(token);
    this.projects.setToken(token);
    this.tasks.setToken(token);
  }

  async loginAs(username: string, password: string): Promise<AuthToken> {
    const auth = await this.users.login({ username, password });
    this.setToken(auth.token);
    return auth;
  }

  async dispose(): Promise<void> {
    await Promise.all([
      this.users.dispose(),
      this.projects.dispose(),
      this.tasks.dispose(),
    ]);
  }
}
