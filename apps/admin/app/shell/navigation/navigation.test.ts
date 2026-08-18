import { describe, expect, it } from 'vitest';

import {
  getNavigationSections,
  isNavigationItemActive,
} from './admin-navigation';

describe('admin navigation', () => {
  it('returns the approved sections in explicit order', () => {
    const sections = getNavigationSections([
      'DASHBOARD_VIEW',
      'REGISTRATION_VIEW',
      'TRAVELLER_VIEW',
      'TRAVEL_GROUP_VIEW',
      'PACKAGE_VIEW',
      'FINANCE_VIEW',
      'DOCUMENT_VIEW',
      'VISA_VIEW',
      'USER_VIEW',
      'AUTH_MANAGE',
    ]);

    expect(sections.map((section) => section.label)).toEqual([
      'Overview',
      'Booking & Travellers',
      'Operations',
      'Catalog',
      'Finance',
      'Compliance',
      'Administration',
    ]);
    expect(
      sections.flatMap((section) => section.items).map((item) => item.label),
    ).toEqual([
      'Dashboard',
      'Registrations',
      'Travellers',
      'Contact Persons',
      'Travel Groups',
      'Logistics',
      'Packages',
      'Dashboard',
      'Invoices',
      'Payments',
      'Expenses',
      'Credit Exceptions',
      'Refunds',
      'Payers',
      'Payment Methods',
      'Documents',
      'Visas',
      'Users',
      'Roles',
    ]);
  });

  it('removes sections with no visible children', () => {
    const sections = getNavigationSections([
      'DASHBOARD_VIEW',
      'TRAVELLER_VIEW',
    ]);

    expect(sections.map((section) => section.label)).toEqual([
      'Overview',
      'Booking & Travellers',
    ]);
    expect(
      sections.find((section) => section.label === 'Operations'),
    ).toBeUndefined();
    expect(
      sections.find((section) => section.label === 'Finance'),
    ).toBeUndefined();
  });

  it('keeps module navigation active on deep routes without prefix collisions', () => {
    const sections = getNavigationSections([
      'REGISTRATION_VIEW',
      'PACKAGE_VIEW',
    ]);
    const registrations = sections
      .flatMap((section) => section.items)
      .find((item) => item.href === '/registrations');
    const packages = sections
      .flatMap((section) => section.items)
      .find((item) => item.href === '/packages');

    expect(registrations).toBeDefined();
    expect(packages).toBeDefined();
    expect(
      isNavigationItemActive(registrations!, '/registrations/01/detail'),
    ).toBe(true);
    expect(
      isNavigationItemActive(registrations!, '/registration-categories'),
    ).toBe(false);
    expect(isNavigationItemActive(packages!, '/packages/01/edit')).toBe(true);
    expect(isNavigationItemActive(packages!, '/package-categories')).toBe(
      false,
    );
  });
});
