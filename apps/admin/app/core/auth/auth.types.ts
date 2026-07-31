import type { AuthResponse } from '../../lib/api';

export type AuthUser = AuthResponse['user'] & {
  permissions?: string[];
};

export type AuthContextValue = {
  user: AuthUser | null;

  logout(): void | Promise<void>;

  isAuthenticated: boolean;
};
