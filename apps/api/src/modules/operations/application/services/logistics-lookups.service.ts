import { Inject, Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Read-only catalog of Slice 6 logistics lookup values.
 */
@Injectable()
export class LogisticsLookupsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  private async listActive(table: any, orderBy: any) {
    return this.db
      .select()
      .from(table)
      .where(and(eq(table.is_deleted, false), eq(table.is_active, true)))
      .orderBy(asc(orderBy));
  }

  async listHotelTypes() {
    return this.listActive(schema.hotelTypes, schema.hotelTypes.name);
  }

  async listHotelStatuses() {
    return this.listActive(schema.hotelStatuses, schema.hotelStatuses.name);
  }

  async listVendorTypes() {
    return this.listActive(schema.vendorTypes, schema.vendorTypes.name);
  }

  async listVendorStatuses() {
    return this.listActive(schema.vendorStatuses, schema.vendorStatuses.name);
  }

  async listRoomTypes() {
    return this.listActive(schema.roomTypes, schema.roomTypes.name);
  }

  async listRoomStatuses() {
    return this.listActive(schema.roomStatuses, schema.roomStatuses.name);
  }

  async listGroupHotelStayStatuses() {
    return this.listActive(
      schema.groupHotelStayStatuses,
      schema.groupHotelStayStatuses.name,
    );
  }

  async listTransportSegmentStatuses() {
    return this.listActive(
      schema.transportSegmentStatuses,
      schema.transportSegmentStatuses.name,
    );
  }

  async listRoomAssignmentStatuses() {
    return this.listActive(
      schema.roomAssignmentStatuses,
      schema.roomAssignmentStatuses.name,
    );
  }
}
