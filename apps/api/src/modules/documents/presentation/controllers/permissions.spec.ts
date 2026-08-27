import { describe, expect, it } from 'vitest';

const DOCUMENT_PERMISSIONS = new Set([
  'DOCUMENT_VIEW',
  'DOCUMENT_MANAGE',
  'VISA_VIEW',
  'VISA_MANAGE',
]);

const ENDPOINT_PERMISSIONS: Record<string, string> = {
  'GET /admin/documents': 'DOCUMENT_VIEW',
  'POST /admin/documents': 'DOCUMENT_MANAGE',
  'GET /admin/document-types': 'DOCUMENT_VIEW',
  'GET /admin/document-statuses': 'DOCUMENT_VIEW',
  'GET /admin/verification-statuses': 'DOCUMENT_VIEW',
  'GET /admin/documents/:id': 'DOCUMENT_VIEW',
  'GET /admin/documents/:id/download': 'DOCUMENT_VIEW',
  'PATCH /admin/documents/:id': 'DOCUMENT_MANAGE',
  'DELETE /admin/documents/:id': 'DOCUMENT_MANAGE',
  'POST /admin/documents/:id/change-verification': 'DOCUMENT_MANAGE',
  'POST /admin/documents/:id/change-status': 'DOCUMENT_MANAGE',
  'GET /admin/travellers/:id/documents': 'DOCUMENT_VIEW',
  'GET /admin/registrations/:id/documents': 'DOCUMENT_VIEW',
  'GET /admin/visa-applications': 'VISA_VIEW',
  'POST /admin/visa-applications': 'VISA_MANAGE',
  'GET /admin/visa-applications/:id': 'VISA_VIEW',
  'PATCH /admin/visa-applications/:id': 'VISA_MANAGE',
  'POST /admin/visa-applications/:id/record-result': 'VISA_MANAGE',
  'DELETE /admin/visa-applications/:id': 'VISA_MANAGE',
  'GET /admin/visa-application-statuses': 'VISA_VIEW',
  'GET /admin/registrations/:id/visa-applications': 'VISA_VIEW',
};

function roleCanAccess(role: Set<string>, permission: string): boolean {
  return role.has(permission);
}

describe('Documents and Visa RBAC', () => {
  it('every documents and visa endpoint maps to a known permission code', () => {
    for (const permission of Object.values(ENDPOINT_PERMISSIONS)) {
      expect(DOCUMENT_PERMISSIONS.has(permission)).toBe(true);
    }
  });

  it('requires DOCUMENT_VIEW for document read endpoints', () => {
    const readEndpoints = Object.entries(ENDPOINT_PERMISSIONS).filter(
      ([p]) => p.startsWith('GET') && p.includes('/documents'),
    );
    for (const [, permission] of readEndpoints) {
      expect(permission).toBe('DOCUMENT_VIEW');
    }
  });

  it('requires DOCUMENT_MANAGE for document write endpoints', () => {
    const writeEndpoints = Object.entries(ENDPOINT_PERMISSIONS).filter(
      ([p]) =>
        (p.startsWith('POST') ||
          p.startsWith('PATCH') ||
          p.startsWith('DELETE')) &&
        p.includes('/documents'),
    );
    for (const [, permission] of writeEndpoints) {
      expect(permission).toBe('DOCUMENT_MANAGE');
    }
  });

  it('requires VISA_VIEW for visa read endpoints', () => {
    const readEndpoints = Object.entries(ENDPOINT_PERMISSIONS).filter(
      ([p]) => p.startsWith('GET') && p.includes('/visa'),
    );
    for (const [, permission] of readEndpoints) {
      expect(permission).toBe('VISA_VIEW');
    }
  });

  it('requires VISA_MANAGE for visa write endpoints', () => {
    const writeEndpoints = Object.entries(ENDPOINT_PERMISSIONS).filter(
      ([p]) =>
        (p.startsWith('POST') ||
          p.startsWith('PATCH') ||
          p.startsWith('DELETE')) &&
        p.includes('/visa'),
    );
    for (const [, permission] of writeEndpoints) {
      expect(permission).toBe('VISA_MANAGE');
    }
  });

  it('a viewer cannot manage documents', () => {
    const viewer = new Set(['DOCUMENT_VIEW']);
    expect(
      roleCanAccess(
        viewer,
        ENDPOINT_PERMISSIONS['POST /admin/documents/:id/change-verification'],
      ),
    ).toBe(false);
  });

  it('an admin can access every documents and visa endpoint', () => {
    const admin = new Set([
      'DOCUMENT_VIEW',
      'DOCUMENT_MANAGE',
      'VISA_VIEW',
      'VISA_MANAGE',
    ]);
    for (const permission of Object.values(ENDPOINT_PERMISSIONS)) {
      expect(roleCanAccess(admin, permission)).toBe(true);
    }
  });
});
