import { Inject, Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { like, max } from 'drizzle-orm';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Generates sequential business numbers for operations aggregates.
 *
 * The format is `<PREFIX>-<YYYY>-<NNNNNN>` where the numeric part is zero
 * padded and incremented from the largest existing number for the current
 * year. This is a tactical local utility for Slice 5; it can be promoted to
 * a shared service once other modules need the same convention.
 */
@Injectable()
export class BusinessNumberService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns the next `TGR-YYYY-NNNNNN` number for a travel group.
   */
  async generateTravelGroupNumber(): Promise<string> {
    return this.nextNumber('TGR', schema.travelGroups.group_number);
  }

  /**
   * Returns the next `GUA-YYYY-NNNNNN` number for a guarantee.
   */
  async generateGuaranteeNumber(): Promise<string> {
    return this.nextNumber('GUA', schema.guarantees.guarantee_number);
  }

  /**
   * Returns the next `STY-YYYY-NNNNNN` number for a group hotel stay.
   */
  async generateStayNumber(): Promise<string> {
    return this.nextNumber('STY', schema.groupHotelStays.stay_number);
  }

  /**
   * Returns the next `VDR-YYYY-NNNNNN` number for a vendor.
   */
  async generateVendorNumber(): Promise<string> {
    return this.nextNumber('VDR', schema.vendors.vendor_number);
  }

  /**
   * Returns the next `TRS-YYYY-NNNNNN` number for a transport segment.
   */
  async generateTransportSegmentNumber(): Promise<string> {
    return this.nextNumber(
      'TRS',
      schema.transportSegments.transport_segment_number,
    );
  }

  private async nextNumber(
    prefix: string,
    column: (typeof schema)['travelGroups']['group_number'],
  ): Promise<string>;
  private async nextNumber(
    prefix: string,
    column: (typeof schema)['guarantees']['guarantee_number'],
  ): Promise<string>;
  private async nextNumber(
    prefix: string,
    column: (typeof schema)['groupHotelStays']['stay_number'],
  ): Promise<string>;
  private async nextNumber(
    prefix: string,
    column: (typeof schema)['vendors']['vendor_number'],
  ): Promise<string>;
  private async nextNumber(
    prefix: string,
    column: (typeof schema)['transportSegments']['transport_segment_number'],
  ): Promise<string>;
  private async nextNumber(
    prefix: string,
    column:
      | (typeof schema)['travelGroups']['group_number']
      | (typeof schema)['guarantees']['guarantee_number']
      | (typeof schema)['groupHotelStays']['stay_number']
      | (typeof schema)['vendors']['vendor_number']
      | (typeof schema)['transportSegments']['transport_segment_number'],
  ): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(column) })
      .from(column.table as any as typeof schema.travelGroups)
      .where(like(column, `${prefix}-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[2] ?? 0) + 1;
    }
    return `${prefix}-${year}-${String(next).padStart(6, '0')}`;
  }
}
