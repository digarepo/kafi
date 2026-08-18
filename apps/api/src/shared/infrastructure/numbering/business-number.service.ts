import { Inject, Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { like, max } from 'drizzle-orm';
import { DATABASE } from '../database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Generates sequential business numbers for aggregates across all bounded
 * contexts.
 *
 * The format is `<PREFIX>-<YYYY>-<NNNNNN>` where the numeric part is zero
 * padded and incremented from the largest existing number for the current
 * year. Promoted from the operations module so other slices can use the same
 * convention without depending on operations.
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

  /**
   * Returns the next `DOC-YYYY-NNNNNN` number for a document.
   */
  async generateDocumentNumber(): Promise<string> {
    return this.nextNumber('DOC', schema.documents.document_number);
  }

  /**
   * Returns the next `VISA-YYYY-NNNNNN` number for a visa application.
   */
  async generateVisaApplicationNumber(): Promise<string> {
    return this.nextNumber('VISA', schema.visaApplications.application_number);
  }

  /**
   * Returns the next `FLT-YYYY-NNNNNN` number for a flight booking.
   */
  async generateFlightBookingNumber(): Promise<string> {
    return this.nextNumber('FLT', schema.flightBookings.booking_number);
  }

  private async nextNumber(prefix: string, column: any): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(column) })
      .from(column.table as any)
      .where(like(column, `${prefix}-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[2] ?? 0) + 1;
    }
    return `${prefix}-${year}-${String(next).padStart(6, '0')}`;
  }
}
