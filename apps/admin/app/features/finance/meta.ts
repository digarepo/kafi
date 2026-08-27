/**
 * Route metadata for the finance admin feature.
 *
 * @remarks
 * - Permission gate: `FINANCE_VIEW` for all routes; create/edit/delete
 *   affordances are additionally gated at the component level with
 *   `FINANCE_CREATE`, `FINANCE_EDIT`, `FINANCE_DELETE`.
 * - Navigation is grouped under Operations, ordered after Booking.
 */

import {
  Banknote,
  CreditCard,
  Landmark,
  Receipt,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
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
    path: '/finance/dashboard',
    title: 'Finance Dashboard',
    navigation: {
      label: 'Dashboard',
      icon: TrendingUp,
      order: 30,
      parent: '/finance',
    },
    breadcrumb: { label: 'Dashboard' },
    permission: 'FINANCE_VIEW',
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
    path: '/expenses',
    title: 'Expenses',
    navigation: {
      label: 'Expenses',
      icon: Receipt,
      order: 35,
      parent: '/finance',
    },
    breadcrumb: { label: 'Expenses' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/expenses/new',
    title: 'Record expense',
    breadcrumb: { label: 'Create' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Create', parent: '/expenses', hidden: true },
  },
  {
    path: '/expenses/:id',
    title: 'Expense detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Detail', parent: '/expenses', hidden: true },
  },
  {
    path: '/finance-exceptions',
    title: 'Finance Exceptions',
    navigation: {
      label: 'Credit Exceptions',
      icon: ShieldCheck,
      order: 36,
      parent: '/finance',
    },
    breadcrumb: { label: 'Finance Exceptions' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/finance-exceptions/new',
    title: 'Authorize credit',
    breadcrumb: { label: 'Create' },
    permission: 'FINANCE_VIEW',
    navigation: {
      label: 'Create',
      parent: '/finance-exceptions',
      hidden: true,
    },
  },
  {
    path: '/finance-exceptions/:id',
    title: 'Exception detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FINANCE_VIEW',
    navigation: {
      label: 'Detail',
      parent: '/finance-exceptions',
      hidden: true,
    },
  },
  {
    path: '/credit-exception-requests',
    title: 'Credit Exception Requests',
    navigation: {
      label: 'Credit Requests',
      icon: ShieldCheck,
      order: 38,
      parent: '/finance',
    },
    breadcrumb: { label: 'Credit Exception Requests' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/credit-exception-requests/new',
    title: 'Request credit exception',
    breadcrumb: { label: 'New request' },
    permission: 'FINANCE_CREDIT_REQUEST',
    navigation: {
      label: 'New request',
      parent: '/credit-exception-requests',
      hidden: true,
    },
  },
  {
    path: '/credit-exception-requests/:id',
    title: 'Request detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FINANCE_VIEW',
    navigation: {
      label: 'Detail',
      parent: '/credit-exception-requests',
      hidden: true,
    },
  },
  {
    path: '/refunds',
    title: 'Refunds',
    navigation: {
      label: 'Refunds',
      icon: RotateCcw,
      order: 37,
      parent: '/finance',
    },
    breadcrumb: { label: 'Refunds' },
    permission: 'FINANCE_VIEW',
  },
  {
    path: '/refunds/new',
    title: 'Create refund',
    breadcrumb: { label: 'Create' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Create', parent: '/refunds', hidden: true },
  },
  {
    path: '/refunds/:id',
    title: 'Refund detail',
    breadcrumb: { label: 'Detail' },
    permission: 'FINANCE_VIEW',
    navigation: { label: 'Detail', parent: '/refunds', hidden: true },
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
