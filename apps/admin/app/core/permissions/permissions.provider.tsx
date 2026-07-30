import { type ReactNode } from 'react';

import { PermissionsContext } from './permissions.context';

type Props = {
  children: ReactNode;

  permissions: string[];
};

export function PermissionsProvider({ children, permissions }: Props) {
  function can(permission: string) {
    return permissions.includes(permission);
  }

  function canAny(required: string[]) {
    return required.some(can);
  }

  function canAll(required: string[]) {
    return required.every(can);
  }

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        can,
        canAny,
        canAll,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}
