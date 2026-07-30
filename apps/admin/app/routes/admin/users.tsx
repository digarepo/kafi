import { redirect, useLoaderData } from 'react-router';

import { UsersPage } from '../../features/users';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Users | Kafi Admin' }];
}

/**
 * Lists staff users.
 */
export async function clientLoader() {
  let user;
  try {
    user = await api.me();
  } catch {
    api.logout();
    throw redirect('/login');
  }

  if (!user.permissions?.includes('USER_VIEW')) {
    throw redirect('/forbidden');
  }

  try {
    const [users, roles, statuses] = await Promise.all([
      api.listUsers(),
      api.listRoles(),
      api.listUserStatuses(),
    ]);
    return { users, roles, statuses };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

/**
 * Users route is intentionally thin.
 *
 * The page component lives in the users feature module and handles
 * state, validation, and API calls.
 */
export default function UsersRoute() {
  const initial = useLoaderData<typeof clientLoader>();
  return <UsersPage initial={initial} />;
}
