import { useLoaderData } from 'react-router';

import { RequirePermission } from '../../core/permissions';
import { UsersPage } from '../../features/users';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Users | Kafi Admin' }];
}

/**
 * Lists staff users.
 */
export async function clientLoader() {
  const [users, roles, statuses] = await Promise.all([
    api.listUsers(),
    api.listRoles(),
    api.listUserStatuses(),
  ]);
  return { users, roles, statuses };
}

/**
 * Users route is intentionally thin.
 *
 * The page component lives in the users feature module and handles
 * state, validation, and API calls.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function UsersRoute() {
  const initial = useLoaderData<typeof clientLoader>();
  return (
    <RequirePermission permission="USER_VIEW">
      <UsersPage initial={initial} />
    </RequirePermission>
  );
}
