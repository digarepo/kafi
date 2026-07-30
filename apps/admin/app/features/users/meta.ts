/**
 * Feature route metadata for the Users module.
 */
import { Users } from 'lucide-react';

import type { RouteMeta } from '../../shell/routing';

export const usersMeta: RouteMeta = {
  path: '/users',

  title: 'Users',

  navigation: {
    label: 'Users',
    icon: Users,
    order: 10,
    group: 'IAM',
  },

  breadcrumb: {
    label: 'Users',
  },

  permission: 'USER_VIEW',
};
