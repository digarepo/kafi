/**
 * Feature route metadata for the Dashboard module.
 */
import { LayoutDashboard } from 'lucide-react';

import type { RouteMeta } from '../../shell/routing';

export const dashboardMeta: RouteMeta = {
  path: '/',

  title: 'Dashboard',

  navigation: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    order: 0,
    group: 'Overview',
  },

  breadcrumb: {
    label: 'Dashboard',
  },
};
