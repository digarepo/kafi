import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { api } from '../../lib/api';

import { AuthContext } from './auth.context';
import { useSessionInactivity } from './use-session-inactivity';

import type { AuthUser } from './auth.types';
import { PermissionsProvider } from '../permissions';

type Props = {
  children: ReactNode;
  initialUser: AuthUser;
};

export function AuthProvider({ children, initialUser }: Props) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const navigate = useNavigate();

  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

  useSessionInactivity({
    enabled: Boolean(user),
    timeoutMs: INACTIVITY_TIMEOUT_MS,
  });

  async function logout() {
    await api.logout();
    setUser(null);
    navigate('/login', { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        user,

        logout,

        isAuthenticated: Boolean(user),
      }}
    >
      <PermissionsProvider permissions={user?.permissions ?? []}>
        {children}
      </PermissionsProvider>
    </AuthContext.Provider>
  );
}
