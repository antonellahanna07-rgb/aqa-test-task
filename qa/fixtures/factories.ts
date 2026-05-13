import { randomBytes } from 'crypto';
import { ProjectCreatePayload } from './api-types';

function tag(): string {
  const wid = process.env.TEST_WORKER_INDEX ?? '0';
  return `${Date.now().toString(36)}${wid}${randomBytes(2).toString('hex')}`;
}

export interface UserSpec {
  username: string;
  email: string;
  password: string;
}

/**
 * Generates unique users per call. Suffixes use a process+worker+random tag
 * so multi-worker runs never collide on the same username/email.
 */
export class UserFactory {
  static build(overrides: Partial<UserSpec> = {}): UserSpec {
    const t = tag();
    return {
      username: overrides.username ?? `qa_user_${t}`,
      email: overrides.email ?? `qa_user_${t}@example.com`,
      password: overrides.password ?? `P@ssw0rd_${t}`,
    };
  }
}

/**
 * Generates unique Vikunja project payloads. Title carries the same
 * `tag()` suffix so multi-worker runs never collide on titles.
 */
export class ProjectFactory {
  static build(overrides: Partial<ProjectCreatePayload> = {}): ProjectCreatePayload {
    const t = tag();
    return {
      title: overrides.title ?? `QA Project ${t}`,
      description: overrides.description ?? `Auto-generated project ${t}`,
      hex_color: overrides.hex_color,
      parent_project_id: overrides.parent_project_id,
    };
  }
}
