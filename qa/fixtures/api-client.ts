import { APIRequestContext, APIResponse, request as pwRequest } from '@playwright/test';
import {
  AuthCredentials,
  AuthToken,
  Project,
  ProjectCreatePayload,
  ProjectUpdatePayload,
  RegisterPayload,
  Task,
  TaskCreatePayload,
  User,
} from './api-types';

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
  context?: APIRequestContext;
}

/**
 * Thin wrapper around Playwright's APIRequestContext.
 *
 * Responsibilities (Single Responsibility Principle):
 *   - hold a base URL and bearer token
 *   - issue raw HTTP requests with consistent headers
 *   - assert successful status codes uniformly
 *
 * Resource-specific clients (UsersApi, ProjectsApi, TasksApi) extend this
 * base without modifying it (Open/Closed Principle).
 */
export class BaseApiClient {
  protected readonly baseUrl: string;
  protected token: string | undefined;
  private ctx: APIRequestContext | undefined;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.token = opts.token;
    this.ctx = opts.context;
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  async dispose(): Promise<void> {
    if (this.ctx) {
      await this.ctx.dispose();
      this.ctx = undefined;
    }
  }

  protected async context(): Promise<APIRequestContext> {
    if (!this.ctx) this.ctx = await pwRequest.newContext();
    return this.ctx;
  }

  protected url(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${p}`;
  }

  protected headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  protected async get<T>(path: string): Promise<T> {
    const ctx = await this.context();
    const res = await ctx.get(this.url(path), { headers: this.headers() });
    return this.parse<T>(res, 'GET', path);
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    const ctx = await this.context();
    const res = await ctx.post(this.url(path), {
      headers: this.headers(),
      data: body ?? {},
    });
    return this.parse<T>(res, 'POST', path);
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    const ctx = await this.context();
    const res = await ctx.put(this.url(path), {
      headers: this.headers(),
      data: body ?? {},
    });
    return this.parse<T>(res, 'PUT', path);
  }

  protected async delete<T = void>(path: string): Promise<T> {
    const ctx = await this.context();
    const res = await ctx.delete(this.url(path), { headers: this.headers() });
    return this.parse<T>(res, 'DELETE', path);
  }

  private async parse<T>(res: APIResponse, method: string, path: string): Promise<T> {
    if (!res.ok()) {
      const body = await res.text().catch(() => '<unreadable>');
      throw new Error(
        `[API] ${method} ${path} failed: ${res.status()} ${res.statusText()} — ${body}`,
      );
    }
    if (res.status() === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Resource clients                                                   */
/* ------------------------------------------------------------------ */

export class UsersApi extends BaseApiClient {
  async register(payload: RegisterPayload): Promise<User> {
    return this.post<User>('/register', payload);
  }

  async login(creds: AuthCredentials): Promise<AuthToken> {
    const token = await this.post<AuthToken>('/login', creds);
    if (token?.token) this.setToken(token.token);
    return token;
  }

  async me(): Promise<User> {
    return this.get<User>('/user');
  }
}

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

/* ------------------------------------------------------------------ */
/*  Facade composing the resource clients                              */
/* ------------------------------------------------------------------ */

export class ApiClient {
  readonly users: UsersApi;
  readonly projects: ProjectsApi;
  readonly tasks: TasksApi;

  constructor(opts: ApiClientOptions) {
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
    await Promise.all([this.users.dispose(), this.projects.dispose(), this.tasks.dispose()]);
  }
}
