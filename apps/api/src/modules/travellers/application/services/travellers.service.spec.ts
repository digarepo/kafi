import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { TravellersService } from './travellers.service.js';
import {
  CheckDuplicateDto,
  CreateTravellerDto,
} from '../dto/travellers.dto.js';
import { createMockDb } from './mock-db.js';

function makeCreateTravellerDto(
  overrides: Partial<CreateTravellerDto> = {},
): CreateTravellerDto {
  return Object.assign(new CreateTravellerDto(), {
    first_name: 'Abebe',
    middle_name: undefined,
    last_name: 'Kebede',
    gender: 'Male' as const,
    date_of_birth: undefined,
    phone_number: '+251911000000',
    email_address: undefined,
    passport_number: undefined,
    fayda_number: undefined,
    country_id: '01KZ4SYZ2F1CP8A00SK7MQFM2H',
    region_id: undefined,
    preferred_language_id: undefined,
    traveller_source_id: undefined,
    traveller_status_id: '01KZ4SYG1B5F1FK9XXF6PPS0AB',
    ...overrides,
  });
}

describe('TravellersService', () => {
  describe('traveller number generation', () => {
    it('starts at 1 when no travellers exist for the year', async () => {
      const db = createMockDb([[{ max: null }]]);
      const service = new TravellersService(db as any);
      const number = await (service as any).generateTravellerNumber();
      expect(number).toMatch(/^TRV-\d{4}-000001$/);
    });

    it('increments from the existing max for the year', async () => {
      const db = createMockDb([[{ max: 'TRV-2026-000009' }]]);
      const service = new TravellersService(db as any);
      const number = await (service as any).generateTravellerNumber();
      expect(number).toBe('TRV-2026-000010');
    });
  });

  describe('date of birth validation', () => {
    it('rejects future dates before persistence', async () => {
      const db = createMockDb([]);
      const service = new TravellersService(db as any);
      const dto = makeCreateTravellerDto({
        date_of_birth: '2030-01-01',
      });

      await expect(service.createTraveller(dto, 'actor')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('duplicate detection', () => {
    it('returns possible matches by first name and phone', async () => {
      const db = createMockDb([
        [
          {
            travellers: {
              id: '01KZ4T00000000000000000001',
              traveller_number: 'TRV-2026-000001',
              first_name: 'Abebe',
              middle_name: null,
              last_name: 'Kebede',
              gender: 'Male',
              date_of_birth: null,
              phone_number: '+251911000000',
              email_address: null,
              passport_number: null,
              fayda_number: null,
              is_deleted: false,
              created_at: new Date(),
              updated_at: new Date(),
            },
            travellerStatuses: { id: '01KZ4T0STATUS', name: 'Active' },
            countries: null,
          },
        ],
      ]);
      const service = new TravellersService(db as any);
      const dto = Object.assign(new CheckDuplicateDto(), {
        first_name: 'Abebe',
        phone_number: '+251911000000',
      });

      const result = await service.checkDuplicate(dto);
      expect(result.possible_matches).toHaveLength(1);
      expect(result.possible_matches[0].first_name).toBe('Abebe');
    });
  });

  describe('primary and emergency contact uniqueness', () => {
    it('clears the existing primary contact flag', async () => {
      const db = createMockDb([undefined]);
      const service = new TravellersService(db as any);

      await (service as any).clearPrimaryContactFlag('traveller-id');

      expect(db.calls).toContain('update');
      expect(db.calls).toContain('set');
      expect(db.calls).toContain('where');
    });

    it('clears the existing emergency contact flag', async () => {
      const db = createMockDb([undefined]);
      const service = new TravellersService(db as any);

      await (service as any).clearEmergencyContactFlag('traveller-id');

      expect(db.calls).toContain('update');
      expect(db.calls).toContain('set');
      expect(db.calls).toContain('where');
    });
  });
});
