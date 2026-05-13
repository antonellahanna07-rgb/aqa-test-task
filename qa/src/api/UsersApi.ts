import { BaseApiClient } from './BaseApiClient';
import {
  AuthToken,
  AuthCredentials,
  RegisterPayload,
  User,
} from './types';

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
