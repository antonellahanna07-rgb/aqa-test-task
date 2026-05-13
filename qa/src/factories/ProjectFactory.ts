import { randomBytes } from 'crypto';
import { ProjectCreatePayload } from '../api/types';

export class ProjectFactory {
  private static tag(): string {
    return `${Date.now().toString(36)}_${randomBytes(2).toString('hex')}`;
  }

  static build(overrides: Partial<ProjectCreatePayload> = {}): ProjectCreatePayload {
    const tag = ProjectFactory.tag();
    return {
      title: overrides.title ?? `Project ${tag}`,
      description: overrides.description ?? `Auto-generated project ${tag}`,
      hex_color: overrides.hex_color,
      parent_project_id: overrides.parent_project_id,
    };
  }
}
