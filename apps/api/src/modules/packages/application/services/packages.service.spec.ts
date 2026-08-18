import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PackagesService,
  getPackageVersionPublicationIssues,
  isWithinRegistrationWindow,
} from './packages.service.js';
import { ConflictException } from '@nestjs/common';

class MockDb {
  private queue: unknown[] = [];

  setQueue(values: unknown[]) {
    this.queue = [...values];
    return this;
  }

  then(onFulfilled?: (value: unknown) => unknown, _onRejected?: unknown) {
    const value = this.queue.shift();
    if (typeof onFulfilled === 'function') {
      onFulfilled(value);
    }
  }

  select(..._args: unknown[]) {
    return this;
  }
  from(..._args: unknown[]) {
    return this;
  }
  leftJoin(..._args: unknown[]) {
    return this;
  }
  innerJoin(..._args: unknown[]) {
    return this;
  }
  where(..._args: unknown[]) {
    return this;
  }
  limit(..._args: unknown[]) {
    return this;
  }
  orderBy(..._args: unknown[]) {
    return this;
  }
  eq(..._args: unknown[]) {
    return this;
  }
  and(..._args: unknown[]) {
    return this;
  }
  not(..._args: unknown[]) {
    return this;
  }
  asc(..._args: unknown[]) {
    return this;
  }
}

const versionRow = {
  package_versions: {
    id: 'PV-1',
    package_version_code: 'PV-001',
    package_template_id: 'PT-1',
    version_name: 'April 2026',
    version_number: 1,
    slug: 'april-2026',
    hero_image_url: null,
    sort_order: 0,
    season_id: null,
    year: 2026,
    departure_date: '2026-04-10',
    return_date: '2026-04-20',
    base_price: '1500.00',
    currency_id: 'CUR',
    max_capacity: 10,
    published_at: new Date('2026-02-01'),
    sales_start_date: '2026-01-01',
    sales_end_date: '2026-03-31',
    package_version_status_id: 'PVS',
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false,
  },
  package_version_statuses: {
    id: 'PVS',
    status_code: 'PUBLISHED',
    name: 'Published',
  },
  package_templates: {
    id: 'PT-1',
    name: 'Hajj Premium',
    package_category_id: 'CAT',
    pilgrimage_type_id: 'PTP',
  },
  package_template_statuses: {
    id: 'PTS',
    status_code: 'ACTIVE',
    name: 'Active',
  },
  package_categories: { id: 'CAT', name: 'Standard' },
  pilgrimage_types: { id: 'PTP', name: 'Hajj' },
  currencies: { id: 'CUR', currency_code: 'ETB', name: 'Birr' },
  seasons: null,
};

const draftVersionRow = {
  ...versionRow,
  package_version_statuses: {
    ...versionRow.package_version_statuses,
    status_code: 'DRAFT',
    name: 'Draft',
  },
};

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
    const db = new MockDb().setQueue([rows]);
    const service = new PackagesService(db as any);

    const result = await service.listCategories();

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
    const db = new MockDb().setQueue([rows]);
    const service = new PackagesService(db as any);

    const result = await service.listPilgrimageTypes();

    expect(result).toEqual(rows);
  });

  describe('assertAvailableForRegistration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns an available published version with remaining capacity', async () => {
      const db = new MockDb().setQueue([[versionRow], [], [{ count: 5 }]]);
      const service = new PackagesService(db as any);

      const result = await service.assertAvailableForRegistration('PV-1');

      expect(result.is_registration_available).toBe(true);
      expect(result.registration_count).toBe(5);
      expect(result.remaining_capacity).toBe(5);
      expect(result.availability_blockers).toEqual([]);
    });

    it('rejects a version that has reached capacity', async () => {
      const db = new MockDb().setQueue([[versionRow], [], [{ count: 10 }]]);
      const service = new PackagesService(db as any);

      const error = (await service
        .assertAvailableForRegistration('PV-1')
        .catch((e: any) => e)) as ConflictException;

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as any).response.code).toBe('PACKAGE_VERSION_UNAVAILABLE');
      expect((error as any).response.blockers).toContain(
        'PACKAGE_VERSION_AT_CAPACITY',
      );
    });

    it('rejects a version that is not published', async () => {
      const db = new MockDb().setQueue([[draftVersionRow], [], [{ count: 0 }]]);
      const service = new PackagesService(db as any);

      const error = (await service
        .assertAvailableForRegistration('PV-1')
        .catch((e: any) => e)) as ConflictException;

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as any).response.code).toBe('PACKAGE_VERSION_UNAVAILABLE');
      expect((error as any).response.blockers).toContain(
        'PACKAGE_VERSION_NOT_PUBLISHED',
      );
    });
  });
});

describe('getPackageVersionPublicationIssues', () => {
  const validVersion = {
    version_name: 'April 2026',
    departure_date: '2026-04-10',
    return_date: '2026-04-20',
    base_price: 1500,
    currency_id: 'CUR',
    max_capacity: 10,
    sales_start_date: '2026-01-01',
    sales_end_date: '2026-03-31',
    template_status: 'ACTIVE',
  };

  it('returns no issues for a valid version', () => {
    const issues = getPackageVersionPublicationIssues(validVersion);
    expect(issues).toEqual([]);
  });

  it('flags missing version name', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      version_name: '',
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'VERSION_NAME_REQUIRED' }),
    );
  });

  it('flags departure after return', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      departure_date: '2026-04-20',
      return_date: '2026-04-10',
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'INVALID_TRAVEL_DATE_ORDER' }),
    );
  });

  it('flags a registration window that ends after the departure', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      sales_end_date: '2026-04-15',
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'REGISTRATION_WINDOW_AFTER_DEPARTURE' }),
    );
  });

  it('flags invalid price', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      base_price: -10,
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'INVALID_PRICE' }),
    );
  });

  it('flags missing currency', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      currency_id: '',
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'CURRENCY_REQUIRED' }),
    );
  });

  it('flags invalid capacity', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      max_capacity: 0,
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'INVALID_CAPACITY' }),
    );
  });

  it('flags an archived template', () => {
    const issues = getPackageVersionPublicationIssues({
      ...validVersion,
      template_status: 'ARCHIVED',
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'TEMPLATE_NOT_ACTIVE' }),
    );
  });
});

describe('isWithinRegistrationWindow', () => {
  it('returns true when today is inside the window', () => {
    const now = new Date('2026-02-15');
    expect(isWithinRegistrationWindow('2026-01-01', '2026-03-31', now)).toBe(
      true,
    );
  });

  it('returns true on the window boundaries', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-03-31');
    expect(isWithinRegistrationWindow('2026-01-01', '2026-03-31', start)).toBe(
      true,
    );
    expect(isWithinRegistrationWindow('2026-01-01', '2026-03-31', end)).toBe(
      true,
    );
  });

  it('returns false outside the window', () => {
    const now = new Date('2026-04-01');
    expect(isWithinRegistrationWindow('2026-01-01', '2026-03-31', now)).toBe(
      false,
    );
  });
});
