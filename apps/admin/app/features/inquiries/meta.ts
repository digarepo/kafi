/**
 * Route metadata for the inquiries admin feature.
 *
 * @remarks
 * - Permission gate: `INQUIRY_VIEW`.
 * - Navigation is grouped under Operations, ordered after Registrations.
 */

import { Inbox } from 'lucide-react';

import type { RouteMeta } from '../../shell/routing';

export const inquiriesMeta: RouteMeta[] = [
  {
    path: '/inquiries',
    title: 'Inquiry inbox',
    navigation: {
      label: 'Inquiry inbox',
      icon: Inbox,
      order: 29,
      parent: '/traveller-booking',
    },
    breadcrumb: { label: 'Inquiry inbox' },
    permission: 'INQUIRY_VIEW',
  },
  {
    path: '/inquiries/:id',
    title: 'Inquiry detail',
    breadcrumb: { label: 'Detail' },
    permission: 'INQUIRY_VIEW',
    navigation: { label: 'Detail', parent: '/inquiries', hidden: true },
  },
];
