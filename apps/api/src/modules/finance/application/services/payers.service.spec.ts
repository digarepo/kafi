import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PayersService } from './payers.service.js';
import { ReferenceDataService } from './reference-data.service.js';
import { createMockDb } from './mock-db.js';

describe('PayersService', () => {
  describe('payer number generation', () => {
    it('starts at 1 when no payers exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new PayersService(db as any, {} as ReferenceDataService);
      const number = await (service as any).generatePayerNumber();
      expect(number).toMatch(/^PAYR-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'PAYR-2026-000003' }]]);
      const service = new PayersService(db as any, {} as ReferenceDataService);
      const number = await (service as any).generatePayerNumber();
      expect(number).toBe('PAYR-2026-000004');
    });
  });

  describe('payer type invariants', () => {
    it('requires organization_name for ORGANIZATION payers', () => {
      const db = createMockDb([]);
      const service = new PayersService(db as any, {} as ReferenceDataService);
      expect(() =>
        (service as any).assertPayerTypeInvariants('ORGANIZATION', {}),
      ).toThrow(BadRequestException);
    });

    it('accepts an ORGANIZATION payer with organization_name', () => {
      const db = createMockDb([]);
      const service = new PayersService(db as any, {} as ReferenceDataService);
      expect(() =>
        (service as any).assertPayerTypeInvariants('ORGANIZATION', {
          organization_name: 'Acme Travel',
        }),
      ).not.toThrow();
    });

    it('requires traveller_id or contact_person_id for INDIVIDUAL payers', () => {
      const db = createMockDb([]);
      const service = new PayersService(db as any, {} as ReferenceDataService);
      expect(() =>
        (service as any).assertPayerTypeInvariants('INDIVIDUAL', {}),
      ).toThrow(BadRequestException);
    });

    it('accepts an INDIVIDUAL payer with a traveller_id', () => {
      const db = createMockDb([]);
      const service = new PayersService(db as any, {} as ReferenceDataService);
      expect(() =>
        (service as any).assertPayerTypeInvariants('INDIVIDUAL', {
          traveller_id: 'traveller-id',
        }),
      ).not.toThrow();
    });
  });
});
