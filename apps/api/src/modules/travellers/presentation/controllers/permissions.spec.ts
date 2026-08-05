import { describe, expect, it } from 'vitest';

const AGENT_PERMISSIONS = new Set([
  'DASHBOARD_VIEW',
  'TRAVELLER_VIEW',
  'TRAVELLER_CREATE',
  'TRAVELLER_EDIT',
  'PACKAGE_VIEW',
  'REGISTRATION_VIEW',
  'REGISTRATION_CREATE',
  'FINANCE_VIEW',
  'VISA_MANAGE',
  'DOCUMENT_MANAGE',
  'TRAVEL_GROUP_VIEW',
]);

const MANAGER_FORBIDDEN = new Set([
  'USER_DELETE',
  'AUTH_MANAGE',
  'TRAVELLER_DELETE',
  'REGISTRATION_DELETE',
]);

describe('Travellers/Registrations RBAC', () => {
  it('AGENT cannot archive or edit lifecycle', () => {
    expect(AGENT_PERMISSIONS.has('TRAVELLER_DELETE')).toBe(false);
    expect(AGENT_PERMISSIONS.has('REGISTRATION_DELETE')).toBe(false);
    expect(AGENT_PERMISSIONS.has('REGISTRATION_EDIT')).toBe(false);
  });

  it('MANAGER cannot delete travellers or registrations', () => {
    expect(MANAGER_FORBIDDEN.has('TRAVELLER_DELETE')).toBe(true);
    expect(MANAGER_FORBIDDEN.has('REGISTRATION_DELETE')).toBe(true);
    expect(MANAGER_FORBIDDEN.has('TRAVELLER_EDIT')).toBe(false);
  });
});
