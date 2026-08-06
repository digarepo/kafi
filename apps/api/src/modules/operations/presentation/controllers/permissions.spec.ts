import { describe, expect, it } from 'vitest';

const ADMIN_PERMISSIONS = new Set(['TRAVEL_GROUP_VIEW', 'TRAVEL_GROUP_MANAGE']);

/**
 * Endpoint -> required permission map, mirroring the guards declared on
 * `AdminTravelGroupsController` and `AdminGroupMembershipsController`.
 */
const ENDPOINT_PERMISSIONS: Record<string, string> = {
  'GET /admin/travel-groups': 'TRAVEL_GROUP_VIEW',
  'GET /admin/travel-groups/:id': 'TRAVEL_GROUP_VIEW',
  'POST /admin/travel-groups': 'TRAVEL_GROUP_MANAGE',
  'PATCH /admin/travel-groups/:id': 'TRAVEL_GROUP_MANAGE',
  'POST /admin/travel-groups/:id/change-status': 'TRAVEL_GROUP_MANAGE',
  'DELETE /admin/travel-groups/:id': 'TRAVEL_GROUP_MANAGE',
  'GET /admin/travel-group-statuses': 'TRAVEL_GROUP_VIEW',
  'GET /admin/travel-groups/:id/memberships': 'TRAVEL_GROUP_VIEW',
  'POST /admin/group-memberships': 'TRAVEL_GROUP_MANAGE',
  'GET /admin/group-memberships/:id': 'TRAVEL_GROUP_VIEW',
  'POST /admin/group-memberships/:id/change-status': 'TRAVEL_GROUP_MANAGE',
  'POST /admin/group-memberships/:id/transfer': 'TRAVEL_GROUP_MANAGE',
  'POST /admin/group-memberships/:id/waive-guarantee': 'TRAVEL_GROUP_MANAGE',
  'DELETE /admin/group-memberships/:id': 'TRAVEL_GROUP_MANAGE',
  'GET /admin/group-membership-statuses': 'TRAVEL_GROUP_VIEW',
  'GET /admin/group-memberships/:id/guarantees': 'TRAVEL_GROUP_VIEW',
  'POST /admin/group-memberships/:id/guarantees': 'TRAVEL_GROUP_MANAGE',
  'POST /admin/guarantees/:id/replace': 'TRAVEL_GROUP_MANAGE',
  'DELETE /admin/guarantees/:id': 'TRAVEL_GROUP_MANAGE',
};

function roleCanAccess(role: Set<string>, permission: string): boolean {
  return role.has(permission);
}

describe('Operations RBAC', () => {
  it('every operations endpoint maps to a known permission code', () => {
    for (const permission of Object.values(ENDPOINT_PERMISSIONS)) {
      expect(ADMIN_PERMISSIONS.has(permission)).toBe(true);
    }
  });

  it('requires TRAVEL_GROUP_VIEW for read endpoints', () => {
    const readEndpoints = Object.entries(ENDPOINT_PERMISSIONS).filter(([p]) =>
      p.startsWith('GET'),
    );
    for (const [, permission] of readEndpoints) {
      expect(permission).toBe('TRAVEL_GROUP_VIEW');
    }
  });

  it('requires TRAVEL_GROUP_MANAGE for write, status and delete endpoints', () => {
    const writeEndpoints = Object.entries(ENDPOINT_PERMISSIONS).filter(
      ([p]) => !p.startsWith('GET'),
    );
    for (const [, permission] of writeEndpoints) {
      expect(permission).toBe('TRAVEL_GROUP_MANAGE');
    }
  });

  it('a viewer without manage permission cannot change travel group status', () => {
    const viewer = new Set(['TRAVEL_GROUP_VIEW']);
    expect(
      roleCanAccess(viewer, ENDPOINT_PERMISSIONS['POST /admin/travel-groups/:id/change-status']),
    ).toBe(false);
  });

  it('a manager can manage but not view is still blocked from view endpoints', () => {
    const manager = new Set(['TRAVEL_GROUP_MANAGE']);
    expect(
      roleCanAccess(manager, ENDPOINT_PERMISSIONS['GET /admin/travel-groups']),
    ).toBe(false);
  });

  it('an admin can access every operations endpoint', () => {
    for (const permission of Object.values(ENDPOINT_PERMISSIONS)) {
      expect(roleCanAccess(ADMIN_PERMISSIONS, permission)).toBe(true);
    }
  });
});
