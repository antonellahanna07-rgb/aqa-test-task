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
