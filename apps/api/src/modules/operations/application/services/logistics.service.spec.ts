import { describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { HotelsService } from './hotels.service.js';
import { VendorsService } from './vendors.service.js';
import { createMockDb } from './mock-db.js';

const actorId = 'actor-1';

const activeStatus = { id: 'hs-active', status_code: 'ACTIVE', name: 'Active' };
const agencyType = { id: 'vt-agency', type_code: 'AGENCY', name: 'Agency' };

function hotelRow(code = 'H-001') {
  return [
    {
      hotels: {
        id: 'h-1',
        hotel_code: code,
        name: 'Test Hotel',
        address: null,
        city: null,
        country: null,
        phone_number: null,
        email_address: null,
        hotel_type_id: null,
        hotel_status_id: activeStatus.id,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      },
      hotel_types: null,
      hotel_statuses: activeStatus,
    },
  ];
}

function vendorRow() {
  return [
    {
      vendors: {
        id: 'v-1',
        vendor_number: 'VDR-2026-000001',
        name: 'Test Agency',
        vendor_type_id: agencyType.id,
        contact_person_name: null,
        phone_number: null,
        alternate_phone_number: null,
        email_address: null,
        address: null,
        tax_identification_number: null,
        license_number: null,
        vendor_status_id: activeStatus.id,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      },
      vendor_types: agencyType,
      vendor_statuses: activeStatus,
    },
  ];
}

describe('HotelsService', () => {
  it('creates a hotel with the default active status', async () => {
    const db = createMockDb([[], [activeStatus], undefined, hotelRow()]);
    const service = new HotelsService(db as any);

    const result = await service.createHotel(
      {
        hotel_code: 'H-001',
        name: 'Test Hotel',
      } as any,
      actorId,
    );

    expect(result.hotel_code).toBe('H-001');
    expect(db.insertValues.length).toBe(1);
    const insert = db.insertValues[0] as any;
    expect(insert.hotel_code).toBe('H-001');
    expect(insert.hotel_status_id).toBe(activeStatus.id);
  });

  it('prevents duplicate hotel codes', async () => {
    const db = createMockDb([hotelRow('H-001')]);
    const service = new HotelsService(db as any);

    await expect(
      service.createHotel(
        {
          hotel_code: 'H-001',
          name: 'Other Hotel',
        } as any,
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });
});

describe('VendorsService', () => {
  it('creates an agency vendor with a generated number', async () => {
    const numbers = {
      generateVendorNumber: vi.fn().mockResolvedValue('VDR-2026-000001'),
    };
    const db = createMockDb([
      [activeStatus],
      [agencyType],
      undefined,
      vendorRow(),
    ]);
    const service = new VendorsService(db as any, numbers as any);

    const result = await service.createVendor(
      { name: 'Test Agency' } as any,
      actorId,
    );

    expect(result.vendor_number).toBe('VDR-2026-000001');
    expect(numbers.generateVendorNumber).toHaveBeenCalled();
    expect(db.insertValues.length).toBe(1);
    const insert = db.insertValues[0] as any;
    expect(insert.vendor_number).toBe('VDR-2026-000001');
    expect(insert.vendor_type_id).toBe(agencyType.id);
  });
});
