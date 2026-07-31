import { routeRegistry } from '../routing';

/**
 * Returns sidebar navigation entries the current user is allowed to see.
 *
 * Items are sorted by `navigation.order` and filtered by `permission` when
 * present in the route metadata.
 */
export function getNavigationItems(permissions: string[]) {
  return routeRegistry
    .filter((route) => route.navigation && !route.navigation.hidden)
    .filter((route) => {
      if (!route.permission) {
        return true;
      }

      return permissions.includes(route.permission);
    })
    .sort((a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0));
}
