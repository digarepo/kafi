import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { AuthenticatedUser } from '../../kernel/principal.js';
import { createTypedId } from '../../kernel/typed-id.js';

function createMockReflector(required: string[] | undefined): Reflector {
  return {
    getAllAndOverride: <T>(key: string) => {
      if (key === PERMISSIONS_KEY) {
        return required as T;
      }
      return undefined as T;
    },
  } as unknown as Reflector;
}

function createMockContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows access when no permissions are required', () => {
    const guard = new PermissionsGuard(createMockReflector(undefined));
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user is missing', () => {
    const guard = new PermissionsGuard(createMockReflector(['USER_VIEW']));
    const context = createMockContext();

    expect(() => guard.canActivate(context)).toThrow('Authentication required');
  });

  it('allows access when the user has all required permissions', () => {
    const user: AuthenticatedUser = {
      sub: createTypedId<'User'>('user-1'),
      email: 'admin@kafitour.com',
      roles: ['ADMIN'],
      permissions: ['USER_VIEW', 'USER_CREATE'],
      must_change_password: false,
    };
    const guard = new PermissionsGuard(createMockReflector(['USER_VIEW']));
    const context = createMockContext(user);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user is missing a required permission', () => {
    const user: AuthenticatedUser = {
      sub: createTypedId<'User'>('user-1'),
      email: 'agent@kafitour.com',
      roles: ['AGENT'],
      permissions: ['USER_VIEW'],
      must_change_password: false,
    };
    const guard = new PermissionsGuard(
      createMockReflector(['USER_VIEW', 'USER_DELETE']),
    );
    const context = createMockContext(user);

    expect(() => guard.canActivate(context)).toThrow(
      'Insufficient permissions',
    );
  });
});
