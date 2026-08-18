import { Plane } from 'lucide-react';
import type { RouteMeta } from '../../shell/routing';

export const flightsMeta: RouteMeta[] = [
  {
    path: '/flight-bookings',
    title: 'Flight bookings',
    navigation: {
      label: 'Flight bookings',
      icon: Plane,
      order: 47,
      group: 'Documents',
    },
    breadcrumb: { label: 'Flight bookings' },
    permission: 'FLIGHT_VIEW',
  },
  {
    path: '/flight-bookings/new',
    title: 'Create flight booking',
    breadcrumb: { label: 'Create' },
    permission: 'FLIGHT_MANAGE',
    navigation: { label: 'Create', parent: '/flight-bookings', hidden: true },
  },
  {
    path: '/flight-bookings/:id',
    title: 'Flight booking detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FLIGHT_VIEW',
    navigation: { label: 'Detail', parent: '/flight-bookings', hidden: true },
  },
];
