import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi } from 'vitest';

import { RegistrationsService } from './registrations.service.js';
import { UpdateRegistrationDto } from '../dto/registrations.dto.js';
import { createMockDb } from './mock-db.js';

function registrationRow(statusCode: string) {
  return [
    {
      registrations: {
        id: '01KZ4REG',
        registration_number: 'REG-2026-000001',
        registration_date: new Date(),
        expected_departure_date: null,
        expected_return_date: null,
        remarks: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      travellers: {
        id: '01KZ4TRV',
        first_name: 'Abebe',
        middle_name: null,
        last_name: 'Kebede',
        phone_number: '+251911000000',
        traveller_number: 'TRV-2026-000001',
        gender: 'Male',
      },
      countries: { id: 'CT', name: 'Ethiopia' },
      travellerStatuses: { id: 'TS', name: 'Active' },
      registrationStatuses: {
        id: 'RS',
        status_code: statusCode,
        name: statusCode,
      },
      packageVersions: {
        id: 'PV',
        package_version_code: 'PKG-001-v1',
        version_name: 'Version 1',
        base_price: '1000.00',
        max_capacity: 10,
      },
      packageTemplates: { id: 'PT', name: 'Hajj Premium' },
      packageVersionStatuses: {
        id: 'PVS',
        status_code: 'PUBLISHED',
        name: 'Published',
      },
      currencies: { id: 'CUR', currency_code: 'ETB', name: 'Ethiopian Birr' },
      seasons: null,
      travellerContacts: null,
      contactPersons: null,
    },
  ];
}

describe('RegistrationsService', () => {
  describe('registration number generation', () => {
    it('starts at 1 when no registrations exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(db as any, emitter as any);
      const number = await (service as any).generateRegistrationNumber();
      expect(number).toMatch(/^REG-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'REG-2026-000009' }]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(db as any, emitter as any);
      const number = await (service as any).generateRegistrationNumber();
      expect(number).toBe('REG-2026-000010');
    });
  });

  describe('published package version validation', () => {
    it('throws when the package version is not published', async () => {
      const db = createMockDb([[]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(db as any, emitter as any);

      await expect(
        (service as any).getPublishedPackageVersion('package-version-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the package version when it is published', async () => {
      const db = createMockDb([
        [{ package_versions: { id: 'package-version-id' } }],
      ]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(db as any, emitter as any);

      const result = await (service as any).getPublishedPackageVersion(
        'package-version-id',
      );
      expect(result.id).toBe('package-version-id');
    });
  });

  describe('capacity limit validation', () => {
    it('counts only active lifecycle registrations (excludes CANCELLED and DRAFT)', async () => {
      const db = createMockDb([[{ count: 5 }]]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(db as any, emitter as any);

      const active = await (service as any).countActiveRegistrations('PV');
      expect(active).toBe(5);
      expect(db.calls).toContain('innerJoin');
      expect(db.calls).toContain('where');
    });
  });

  describe('registration lifecycle rules', () => {
    it('rejects updates to a cancelled registration', async () => {
      const db = createMockDb([registrationRow('CANCELLED')]);
      const emitter = new EventEmitter2();
      const service = new RegistrationsService(db as any, emitter as any);

      await expect(
        service.updateRegistration(
          '01KZ4REG',
          Object.assign(new UpdateRegistrationDto(), {
            expected_departure_date: undefined,
            expected_return_date: undefined,
            remarks: 'new note',
          }),
          'actor',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects departure date after return date', async () => {
      const db = createMockDb([registrationRow('CONFIRMED')]);
      const emitter = { emit: vi.fn() };
      const service = new RegistrationsService(db as any, emitter as any);

      await expect(
        service.updateRegistration(
          '01KZ4REG',
          Object.assign(new UpdateRegistrationDto(), {
            expected_departure_date: '2026-02-10',
            expected_return_date: '2026-02-05',
          }),
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
