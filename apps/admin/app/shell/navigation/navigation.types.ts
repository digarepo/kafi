import type { RouteMeta } from '../routing';

/**
 * Sidebar navigation entries derived from route metadata, optionally with
 * nested children.
 */
export interface NavigationItem extends RouteMeta {
  children?: NavigationItem[];
}
