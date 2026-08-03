/**
 * Route metadata for the travellers admin feature.
 *
 * @remarks
 * - Permission gate: `TRAVELLER_VIEW`.
 * - Navigation is grouped under Operations, ordered after Packages.
 */

import { Users } from 'lucide-react';
import type { RouteMeta } from '../../shell/routing';

export const travellersMeta: RouteMeta = {
  path: '/travellers',
  title: 'Travellers',
  navigation: {
    label: 'Travellers',
    icon: Users,
    order: 25,
    group: 'Operations',
  },
  breadcrumb: {
    label: 'Travellers',
  },
  permission: 'TRAVELLER_VIEW',
};
