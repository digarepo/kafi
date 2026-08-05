/**
 * Route metadata for the finance admin feature.
 *
 * @remarks
 * - Permission gate: `FINANCE_VIEW` for all routes; create/edit/delete
 *   affordances are additionally gated at the component level with
 *   `FINANCE_CREATE`, `FINANCE_EDIT`, `FINANCE_DELETE`.
 * - Navigation is grouped under Operations, ordered after Booking.
 */

import { Banknote, CreditCard, Landmark, Users } from 'lucide-react';
import type { RouteMeta } from '../../shell/routing';

export const financeMeta: RouteMeta[] = [
  {
    path: '/finance',
    title: 'Finance',
    navigation: {
      label: 'Finance',
      icon: Landmark,
      order: 30,
      group: 'Operations',
      isGroup: true,
    },
    breadcrumb: { label: 'Finance', hidden: true },
  },
  {
    path: '/invoices',
    title: 'Invoices',
    navigation: {
      label: 'Invoices',
      icon: Banknote,
      order: 31,
      parent: '/finance',
    },
    breadcrumb: { label: 'Invoices' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/invoices/new',
    title: 'Create invoice',
    breadcrumb: { label: 'Create' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Create', parent: '/invoices', hidden: true },
  },
  {
    path: '/invoices/:id',
    title: 'Invoice detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Detail', parent: '/invoices', hidden: true },
  },
  {
    path: '/payments',
    title: 'Payments',
    navigation: {
      label: 'Payments',
      icon: CreditCard,
      order: 32,
      parent: '/finance',
    },
    breadcrumb: { label: 'Payments' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/payments/new',
    title: 'Record payment',
    breadcrumb: { label: 'Create' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Create', parent: '/payments', hidden: true },
  },
  {
    path: '/payments/:id',
    title: 'Payment detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Detail', parent: '/payments', hidden: true },
  },
  {
    path: '/payers',
    title: 'Payers',
    navigation: {
      label: 'Payers',
      icon: Users,
      order: 33,
      parent: '/finance',
    },
    breadcrumb: { label: 'Payers' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/payment-methods',
    title: 'Payment methods',
    navigation: {
      label: 'Payment methods',
      icon: CreditCard,
      order: 34,
      parent: '/finance',
    },
    breadcrumb: { label: 'Payment methods' },
    permission: 'FINANCE_VIEW',
  },
];
