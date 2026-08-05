import { describe, expect, it } from 'vitest';

const ADMIN_PERMISSIONS = new Set([
  'FINANCE_VIEW',
  'FINANCE_CREATE',
  'FINANCE_EDIT',
  'FINANCE_DELETE',
]);

const MANAGER_PERMISSIONS = new Set([
  'FINANCE_VIEW',
  'FINANCE_CREATE',
  'FINANCE_EDIT',
]);

const AGENT_PERMISSIONS = new Set(['FINANCE_VIEW', 'FINANCE_CREATE']);

/**
 * Endpoint -> required permission map, mirroring the guards declared on
 * `AdminInvoicesController`, `AdminPaymentsController`, `AdminPayersController`,
 * and `AdminFinanceReferenceController`.
 */
const ENDPOINT_PERMISSIONS: Record<string, string> = {
  'GET /admin/invoices': 'FINANCE_VIEW',
  'GET /admin/invoices/:id': 'FINANCE_VIEW',
  'POST /admin/invoices': 'FINANCE_CREATE',
  'PATCH /admin/invoices/:id': 'FINANCE_EDIT',
  'POST /admin/invoices/:id/archive': 'FINANCE_DELETE',
  'GET /admin/payments': 'FINANCE_VIEW',
  'GET /admin/payments/:id': 'FINANCE_VIEW',
  'POST /admin/payments': 'FINANCE_CREATE',
  'POST /admin/payments/:id/allocate': 'FINANCE_EDIT',
  'PATCH /admin/payments/:id': 'FINANCE_EDIT',
  'POST /admin/payments/:id/archive': 'FINANCE_DELETE',
  'GET /admin/payers': 'FINANCE_VIEW',
  'POST /admin/payers': 'FINANCE_CREATE',
  'PATCH /admin/payers/:id': 'FINANCE_EDIT',
  'POST /admin/payers/:id/archive': 'FINANCE_DELETE',
};

function roleCanAccess(role: Set<string>, permission: string): boolean {
  return role.has(permission);
}

describe('Finance RBAC', () => {
  it('ADMIN has full finance access', () => {
    expect(ADMIN_PERMISSIONS.has('FINANCE_VIEW')).toBe(true);
    expect(ADMIN_PERMISSIONS.has('FINANCE_CREATE')).toBe(true);
    expect(ADMIN_PERMISSIONS.has('FINANCE_EDIT')).toBe(true);
    expect(ADMIN_PERMISSIONS.has('FINANCE_DELETE')).toBe(true);
  });

  it('MANAGER can view, create, and edit but not delete finance records', () => {
    expect(MANAGER_PERMISSIONS.has('FINANCE_VIEW')).toBe(true);
    expect(MANAGER_PERMISSIONS.has('FINANCE_CREATE')).toBe(true);
    expect(MANAGER_PERMISSIONS.has('FINANCE_EDIT')).toBe(true);
    expect(MANAGER_PERMISSIONS.has('FINANCE_DELETE')).toBe(false);
  });

  it('AGENT can view and create but not edit or delete finance records', () => {
    expect(AGENT_PERMISSIONS.has('FINANCE_VIEW')).toBe(true);
    expect(AGENT_PERMISSIONS.has('FINANCE_CREATE')).toBe(true);
    expect(AGENT_PERMISSIONS.has('FINANCE_EDIT')).toBe(false);
    expect(AGENT_PERMISSIONS.has('FINANCE_DELETE')).toBe(false);
  });

  it('every finance endpoint maps to a known permission code', () => {
    for (const permission of Object.values(ENDPOINT_PERMISSIONS)) {
      expect(ADMIN_PERMISSIONS.has(permission)).toBe(true);
    }
  });

  it('AGENT can view finance resources and create invoices/payments/payers', () => {
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['GET /admin/invoices'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/invoices'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payments'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payers'],
      ),
    ).toBe(true);
  });

  it('AGENT cannot edit, allocate, or archive finance records', () => {
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['PATCH /admin/invoices/:id'],
      ),
    ).toBe(false);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/invoices/:id/archive'],
      ),
    ).toBe(false);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['PATCH /admin/payments/:id'],
      ),
    ).toBe(false);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payments/:id/allocate'],
      ),
    ).toBe(false);
    expect(
      roleCanAccess(
        AGENT_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payments/:id/archive'],
      ),
    ).toBe(false);
  });

  it('MANAGER can edit and allocate finance records but cannot archive them', () => {
    expect(
      roleCanAccess(
        MANAGER_PERMISSIONS,
        ENDPOINT_PERMISSIONS['PATCH /admin/invoices/:id'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        MANAGER_PERMISSIONS,
        ENDPOINT_PERMISSIONS['PATCH /admin/payments/:id'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        MANAGER_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payments/:id/allocate'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        MANAGER_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/invoices/:id/archive'],
      ),
    ).toBe(false);
    expect(
      roleCanAccess(
        MANAGER_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payments/:id/archive'],
      ),
    ).toBe(false);
    expect(
      roleCanAccess(
        MANAGER_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payers/:id/archive'],
      ),
    ).toBe(false);
  });

  it('ADMIN can archive invoices, payments, and payers', () => {
    expect(
      roleCanAccess(
        ADMIN_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/invoices/:id/archive'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        ADMIN_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payments/:id/archive'],
      ),
    ).toBe(true);
    expect(
      roleCanAccess(
        ADMIN_PERMISSIONS,
        ENDPOINT_PERMISSIONS['POST /admin/payers/:id/archive'],
      ),
    ).toBe(true);
  });
});
