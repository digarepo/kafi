export type Permission = string;

export type PermissionsContextValue = {
  permissions: Permission[];

  can(permission: Permission): boolean;

  canAny(permissions: Permission[]): boolean;

  canAll(permissions: Permission[]): boolean;
};
