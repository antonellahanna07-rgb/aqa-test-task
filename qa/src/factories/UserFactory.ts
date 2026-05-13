import { randomBytes } from 'crypto';

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
  private static suffix(): string {
    const wid = process.env.TEST_WORKER_INDEX ?? '0';
    return `${Date.now().toString(36)}${wid}${randomBytes(2).toString('hex')}`;
  }

  static build(overrides: Partial<UserSpec> = {}): UserSpec {
    const tag = UserFactory.suffix();
    return {
      username: overrides.username ?? `qa_user_${tag}`,
      email: overrides.email ?? `qa_user_${tag}@example.com`,
      password: overrides.password ?? `P@ssw0rd_${tag}`,
    };
  }
}
