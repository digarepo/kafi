import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by the PermissionsGuard.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Marks a route or controller as requiring one or more permissions.
 *
 * @param permissions - Permission codes that grant access to the handler.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
