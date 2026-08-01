import { routeRegistry, type RouteMeta } from '../routing';
import type { NavigationItem } from './navigation.types';

/**
 * Returns sidebar navigation entries the current user is allowed to see.
 *
 * Items are sorted by `navigation.order` and filtered by `permission` when
 * present in the route metadata. Child items are attached to their declared
 * parent to preserve the single source of truth in the route registry.
 */
export function getNavigationItems(permissions: string[]): NavigationItem[] {
  const filtered = routeRegistry
    .filter((route): route is RouteMeta =>
      Boolean(route.navigation && !route.navigation.hidden),
    )
    .filter((route) => {
      if (!route.permission) {
        return true;
      }

      return permissions.includes(route.permission);
    })
    .sort((a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0));

  const byPath = new Map<string, NavigationItem>();
  for (const item of filtered) {
    byPath.set(item.path, { ...item, children: [] });
  }

  const tree: NavigationItem[] = [];
  for (const item of filtered) {
    const node = byPath.get(item.path)!;
    const parentPath = item.navigation?.parent;
    const parent = parentPath ? byPath.get(parentPath) : undefined;

    if (parent) {
      parent.children!.push(node);
    } else {
      tree.push(node);
    }
  }

  for (const item of tree) {
    item.children?.sort(
      (a, b) => (a.navigation?.order ?? 0) - (b.navigation?.order ?? 0),
    );
  }

  return tree;
}
