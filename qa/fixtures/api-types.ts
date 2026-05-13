export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  created?: string;
  updated?: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterPayload extends AuthCredentials {
  email: string;
}

export interface AuthToken {
  token: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  identifier?: string;
  is_archived?: boolean;
  parent_project_id?: number;
  hex_color?: string;
}

export interface ProjectCreatePayload {
  title: string;
  description?: string;
  hex_color?: string;
  parent_project_id?: number;
}

export interface ProjectUpdatePayload extends Partial<ProjectCreatePayload> {
  is_archived?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  done?: boolean;
  project_id: number;
  priority?: number;
  due_date?: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string;
}
