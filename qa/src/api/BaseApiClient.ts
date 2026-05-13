import { APIRequestContext, APIResponse, request as pwRequest } from '@playwright/test';

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
  /**
   * Optional pre-built request context. Pass one when you want all clients
   * to share cookies/storage (e.g. inside a worker fixture). When omitted,
   * the client builds its own context lazily.
   */
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
 * It does NOT know about Vikunja resources — that lives in subclasses
 * (UsersApi, ProjectsApi, TasksApi). Those subclasses extend behavior
 * without modifying this file (Open/Closed Principle).
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

  protected async context(): Promise<APIRequestContext> {
    if (!this.ctx) {
      this.ctx = await pwRequest.newContext();
    }
    return this.ctx;
  }

  async dispose(): Promise<void> {
    if (this.ctx) {
      await this.ctx.dispose();
      this.ctx = undefined;
    }
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
