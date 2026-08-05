import type { LucideIcon } from 'lucide-react';

/**
 * Metadata describing an admin route, its navigation behavior, breadcrumbs,
 * and the permission required to access it.
 */
export interface RouteMeta {
  /**
   * Absolute application path.
   *
   * Example:
   * "/"
   * "/users"
   * "/roles"
   */
  path: string;

  /**
   * Default page title.
   */
  title: string;

  /**
   * Sidebar navigation metadata.
   */
  navigation?: {
    label: string;

    icon?: LucideIcon;

    order?: number;

    group?: string;

    parent?: string;

    hidden?: boolean;

    /** Whether this item is a non-routable sidebar group header. */
    isGroup?: boolean;
  };

  /**
   * Breadcrumb metadata.
   */
  breadcrumb?: {
    label: string;

    hidden?: boolean;
  };

  /**
   * Required permission.
   */
  permission?: string;
}
