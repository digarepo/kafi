import type { LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router';
import {
  Banknote,
  Calendar,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Plane,
  Receipt,
  RotateCcw,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

export interface AdminNavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

export interface AdminNavigationSection {
  id: string;
  label: string;
  order: number;
  items: AdminNavigationItem[];
}

const navigationSections: AdminNavigationSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    order: 0,
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        permission: 'DASHBOARD_VIEW',
      },
      {
        id: 'inquiries',
        label: 'Inquiry Inbox',
        href: '/inquiries',
        icon: Inbox,
        permission: 'INQUIRY_VIEW',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    order: 10,
    items: [
      {
        id: 'packages',
        label: 'Packages',
        href: '/packages',
        icon: Package,
        permission: 'PACKAGE_VIEW',
      },
      {
        id: 'travellers',
        label: 'Travellers',
        href: '/travellers',
        icon: Users,
        permission: 'TRAVELLER_VIEW',
      },
      {
        id: 'contact-persons',
        label: 'Contact Persons',
        href: '/contact-persons',
        icon: Users,
        permission: 'TRAVELLER_VIEW',
      },
      {
        id: 'registrations',
        label: 'Registrations',
        href: '/registrations',
        icon: Calendar,
        permission: 'REGISTRATION_VIEW',
      },
      {
        id: 'travel-groups',
        label: 'Travel Groups',
        href: '/travel-groups',
        icon: Users,
        permission: 'TRAVEL_GROUP_VIEW',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    order: 30,
    items: [
      {
        id: 'finance-dashboard',
        label: 'Dashboard',
        href: '/finance/dashboard',
        icon: TrendingUp,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'invoices',
        label: 'Invoices',
        href: '/invoices',
        icon: Banknote,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'payments',
        label: 'Payments',
        href: '/payments',
        icon: Banknote,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'expenses',
        label: 'Expenses',
        href: '/expenses',
        icon: Receipt,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'finance-exceptions',
        label: 'Credit Exceptions',
        href: '/finance-exceptions',
        icon: ShieldCheck,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'credit-exception-requests',
        label: 'Credit Requests',
        href: '/credit-exception-requests',
        icon: ShieldCheck,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'refunds',
        label: 'Refunds',
        href: '/refunds',
        icon: RotateCcw,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'payers',
        label: 'Payers',
        href: '/payers',
        icon: Users,
        permission: 'FINANCE_VIEW',
      },
      {
        id: 'payment-methods',
        label: 'Payment Methods',
        href: '/payment-methods',
        icon: Banknote,
        permission: 'FINANCE_VIEW',
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    order: 20,
    items: [
      {
        id: 'documents',
        label: 'Documents',
        href: '/documents',
        icon: FileText,
        permission: 'DOCUMENT_VIEW',
      },
      {
        id: 'visas',
        label: 'Visas',
        href: '/visa-applications',
        icon: Plane,
        permission: 'VISA_VIEW',
      },
      {
        id: 'flight-bookings',
        label: 'Flight Bookings',
        href: '/flight-bookings',
        icon: Plane,
        permission: 'FLIGHT_VIEW',
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    order: 40,
    items: [
      {
        id: 'users',
        label: 'Users',
        href: '/users',
        icon: Users,
        permission: 'USER_VIEW',
      },
      {
        id: 'roles',
        label: 'Roles',
        href: '/roles',
        icon: Shield,
        permission: 'AUTH_MANAGE',
      },
    ],
  },
];

export function getNavigationSections(
  permissions: string[],
): AdminNavigationSection[] {
  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    }))
    .filter((section) => section.items.length > 0)
    .sort((a, b) => a.order - b.order);
}

export function isNavigationItemActive(
  item: AdminNavigationItem,
  pathname: string,
): boolean {
  if (item.href === '/') return pathname === '/';
  return (
    pathname === item.href ||
    Boolean(matchPath({ path: `${item.href}/*`, end: false }, pathname))
  );
}
