import { dashboardMeta } from '../../features/dashboard/meta';
import { packagesMeta } from '../../features/packages/meta';
import { profileMeta } from '../../features/profile/meta';
import { rolesMeta } from '../../features/roles/meta';
import { travellersMeta } from '../../features/travellers/meta';
import { usersMeta } from '../../features/users/meta';

/**
 * Central registry of all admin route metadata.
 *
 * Import feature `meta.ts` objects here so they participate in routing,
 * navigation, breadcrumbs, and permission checks.
 */
export const routeRegistry = [
  dashboardMeta,
  usersMeta,
  packagesMeta,
  travellersMeta,
  rolesMeta,
  profileMeta,
];
