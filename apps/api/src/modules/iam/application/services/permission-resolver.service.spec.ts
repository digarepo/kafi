import { describe, it, expect, vi } from 'vitest';
import { PermissionResolver } from './permission-resolver.service.js';

describe('PermissionResolver', () => {
  function createMockDb(rows: { permission_code: string }[] = []) {
    return {
      selectDistinct: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve(rows)),
          })),
        })),
      })),
    } as any;
  }

  it('returns an empty array for an empty list of role ids', async () => {
    const resolver = new PermissionResolver(createMockDb());
    const result = await resolver.resolveForRoles([]);
    expect(result).toEqual([]);
  });

  it('returns sorted permission codes for the given roles', async () => {
    const resolver = new PermissionResolver(
      createMockDb([
        { permission_code: 'USER_DELETE' },
        { permission_code: 'USER_VIEW' },
        { permission_code: 'USER_CREATE' },
      ]),
    );
    const result = await resolver.resolveForRoles(['role-1', 'role-2']);
    expect(result).toEqual(['USER_CREATE', 'USER_DELETE', 'USER_VIEW']);
  });

  it('delegates resolveForUser to resolveForRoles', async () => {
    const resolver = new PermissionResolver(
      createMockDb([{ permission_code: 'USER_VIEW' }]),
    );
    const result = await resolver.resolveForUser(['role-1']);
    expect(result).toEqual(['USER_VIEW']);
  });
});
