/**
 * Feature route metadata for the My Profile page.
 */
import type { RouteMeta } from '../../shell/routing';

export const profileMeta: RouteMeta = {
  path: '/profile',

  title: 'My Profile',

  navigation: {
    label: 'My Profile',
    hidden: true,
  },

  breadcrumb: {
    label: 'My Profile',
  },
};
