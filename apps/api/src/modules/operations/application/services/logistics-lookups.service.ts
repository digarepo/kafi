import { Inject, Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Read-only catalog of logistics lookup values.
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

  async listCities(countryId?: string) {
    const conditions = [eq(schema.cities.is_deleted, false)];
    if (countryId) {
      conditions.push(eq(schema.cities.country_id, countryId));
    }
    return this.db
      .select({ id: schema.cities.id, name: schema.cities.name })
      .from(schema.cities)
      .where(and(...conditions))
      .orderBy(asc(schema.cities.name));
  }

  async listRoomAssignmentStatuses() {
    return this.listActive(
      schema.roomAssignmentStatuses,
      schema.roomAssignmentStatuses.name,
    );
  }
}
