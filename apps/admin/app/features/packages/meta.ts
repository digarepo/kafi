import { PackageIcon } from '@phosphor-icons/react';
import type { RouteMeta } from '../../shell/routing';

export const packagesMeta: RouteMeta = {
  path: '/packages',
  title: 'Packages',
  navigation: {
    label: 'Packages',
    icon: PackageIcon,
    order: 20,
    group: 'Operations',
  },
  breadcrumb: {
    label: 'Packages',
  },
  permission: 'PACKAGE_VIEW',
};
