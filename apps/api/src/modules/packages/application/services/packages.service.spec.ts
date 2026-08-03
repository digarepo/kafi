import { describe, it, expect, vi } from 'vitest';
import { PackagesService } from './packages.service.js';

function createMockDb(rows: any) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  } as any;
}

describe('PackagesService', () => {
  it('lists package categories', async () => {
    const rows = [
      {
        id: 'cat-1',
        category_code: 'ECONOMY',
        name: 'Economy',
        is_active: true,
      },
    ];
    const db = createMockDb(rows);
    const service = new PackagesService(db);

    const result = await service.listCategories();

    expect(db.select).toHaveBeenCalled();
    expect(result).toEqual(rows);
  });

  it('lists pilgrimage types', async () => {
    const rows = [
      {
        id: 'pt-1',
        pilgrimage_type_code: 'UMRAH',
        name: 'Umrah',
        is_active: true,
      },
    ];
    const db = createMockDb(rows);
    const service = new PackagesService(db);

    const result = await service.listPilgrimageTypes();

    expect(db.select).toHaveBeenCalled();
    expect(result).toEqual(rows);
  });
});
