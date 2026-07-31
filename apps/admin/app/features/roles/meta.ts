/**
 * Feature route metadata for the Roles module.
 */
import { Shield } from 'lucide-react';

import type { RouteMeta } from '../../shell/routing';

export const rolesMeta: RouteMeta = {
  path: '/roles',

  title: 'Roles',

  navigation: {
    label: 'Roles',
    icon: Shield,
    order: 20,
    group: 'IAM',
  },

  breadcrumb: {
    label: 'Roles',
  },

  permission: 'AUTH_MANAGE',
};
