import { createContext, useContext } from 'react';

import type { PermissionsContextValue } from './permissions.types';

export const PermissionsContext = createContext<PermissionsContextValue | null>(
  null,
);

export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used inside PermissionsProvider');
  }

  return context;
}
