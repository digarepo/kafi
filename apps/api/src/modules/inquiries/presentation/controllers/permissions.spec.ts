import { describe, expect, it } from 'vitest';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { RateLimitGuard } from '../../../../shared/application/guards/rate-limit.guard.js';
import { AdminInquiriesController } from './admin-inquiries.controller.js';
import { PublicInquiriesController } from './public-inquiries.controller.js';

/** Reads the permissions attached to a controller method by the decorator. */
function permissionsFor(controller: any, method: string): string[] | undefined {
  return Reflect.getMetadata(PERMISSIONS_KEY, controller.prototype[method]);
}

/** Reads the guards applied at the controller (class) level. */
function classGuards(controller: any): unknown[] {
  return Reflect.getMetadata('__guards__', controller) ?? [];
}

const READ_METHODS = ['listInquiries', 'getInquiry', 'getSummary'];
const WRITE_METHODS = ['updateInquiry', 'changeStatus', 'archiveInquiry'];

describe('Inquiries RBAC', () => {
  it('protects the admin controller with JWT and permissions guards', () => {
    const guards = classGuards(AdminInquiriesController);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(PermissionsGuard);
  });

  it('requires INQUIRY_VIEW on every admin read endpoint', () => {
    for (const method of READ_METHODS) {
      expect(permissionsFor(AdminInquiriesController, method)).toEqual([
        'INQUIRY_VIEW',
      ]);
    }
  });

  it('requires INQUIRY_MANAGE on every admin write endpoint', () => {
    for (const method of WRITE_METHODS) {
      expect(permissionsFor(AdminInquiriesController, method)).toEqual([
        'INQUIRY_MANAGE',
      ]);
    }
  });

  it('leaves no admin handler unguarded', () => {
    const handlers = Object.getOwnPropertyNames(
      AdminInquiriesController.prototype,
    ).filter(
      (name) =>
        name !== 'constructor' &&
        typeof AdminInquiriesController.prototype[
          name as keyof typeof AdminInquiriesController.prototype
        ] === 'function',
    );

    for (const handler of handlers) {
      expect(
        permissionsFor(AdminInquiriesController, handler),
        `${handler} is missing @RequirePermissions`,
      ).toBeDefined();
    }
  });

  it('a viewer cannot reach management endpoints', () => {
    const viewer = new Set(['INQUIRY_VIEW']);
    for (const method of WRITE_METHODS) {
      const required = permissionsFor(AdminInquiriesController, method)!;
      expect(required.every((code) => viewer.has(code))).toBe(false);
    }
  });

  it('an operator holding both permissions can reach every endpoint', () => {
    const operator = new Set(['INQUIRY_VIEW', 'INQUIRY_MANAGE']);
    for (const method of [...READ_METHODS, ...WRITE_METHODS]) {
      const required = permissionsFor(AdminInquiriesController, method)!;
      expect(required.every((code) => operator.has(code))).toBe(true);
    }
  });

  describe('public controller', () => {
    it('is rate limited but never JWT or permission guarded', () => {
      const guards = classGuards(PublicInquiriesController);
      expect(guards).toContain(RateLimitGuard);
      expect(guards).not.toContain(JwtAuthGuard);
      expect(guards).not.toContain(PermissionsGuard);
    });

    it('declares no permission requirements on any handler', () => {
      for (const method of [
        'createBooking',
        'createCallback',
        'createContact',
        'createEnquiry',
      ]) {
        expect(permissionsFor(PublicInquiriesController, method)).toBeUndefined();
      }
    });
  });
});
