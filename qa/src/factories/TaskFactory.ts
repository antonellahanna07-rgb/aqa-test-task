import { randomBytes } from 'crypto';
import { TaskCreatePayload } from '../api/types';

export class TaskFactory {
  static build(overrides: Partial<TaskCreatePayload> = {}): TaskCreatePayload {
    const tag = `${Date.now().toString(36)}_${randomBytes(2).toString('hex')}`;
    return {
      title: overrides.title ?? `Task ${tag}`,
      description: overrides.description,
      priority: overrides.priority,
      due_date: overrides.due_date,
    };
  }
}
