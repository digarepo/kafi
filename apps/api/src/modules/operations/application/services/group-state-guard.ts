import { ConflictException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq } from 'drizzle-orm';
import * as schema from '@kafi/database';

/**
 * Protected travel group states where accommodation mutations are not allowed.
 */
export const PROTECTED_GROUP_STATES = [
  'TRAVEL_PREPARED',
  'DEPARTED',
  'COMPLETED',
] as const;

/**
 * Asserts that the travel group is not in a protected state
 * (TRAVEL_PREPARED, DEPARTED, COMPLETED).
 *
 * Use this guard before any stay, room, or room-assignment mutation
 * that could invalidate the operational state.
 *
 * @param db - Drizzle database instance (or transaction client).
 * @param travelGroupId - The travel group ID to check.
 * @param operation - Human-readable operation name for the error message.
 * @throws ConflictException if the group is in a protected state.
 */
export async function assertGroupAllowsAccommodationChange(
  db: MySql2Database<typeof schema>,
  travelGroupId: string,
  operation = 'modify accommodation',
): Promise<void> {
  const [row] = await db
    .select({
      status_code: schema.travelGroupStatuses.status_code,
    })
    .from(schema.travelGroups)
    .innerJoin(
      schema.travelGroupStatuses,
      eq(
        schema.travelGroups.travel_group_status_id,
        schema.travelGroupStatuses.id,
      ),
    )
    .where(
      and(
        eq(schema.travelGroups.id, travelGroupId),
        eq(schema.travelGroups.is_deleted, false),
      ),
    )
    .limit(1);

  if (row && PROTECTED_GROUP_STATES.includes(row.status_code as any)) {
    throw new ConflictException(
      `Cannot ${operation} for a ${row.status_code} travel group`,
    );
  }
}

/**
 * Resolves the travel group ID for a given hotel stay.
 */
export async function resolveTravelGroupIdForStay(
  db: MySql2Database<typeof schema>,
  stayId: string,
): Promise<string> {
  const [row] = await db
    .select({
      travel_group_id: schema.groupHotelStays.travel_group_id,
    })
    .from(schema.groupHotelStays)
    .where(
      and(
        eq(schema.groupHotelStays.id, stayId),
        eq(schema.groupHotelStays.is_deleted, false),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ConflictException('Group hotel stay not found');
  }
  return row.travel_group_id;
}

/**
 * Resolves the travel group ID for a given room (via its hotel stay).
 */
export async function resolveTravelGroupIdForRoom(
  db: MySql2Database<typeof schema>,
  roomId: string,
): Promise<string> {
  const [row] = await db
    .select({
      travel_group_id: schema.groupHotelStays.travel_group_id,
    })
    .from(schema.rooms)
    .innerJoin(
      schema.groupHotelStays,
      eq(schema.rooms.group_hotel_stay_id, schema.groupHotelStays.id),
    )
    .where(
      and(
        eq(schema.rooms.id, roomId),
        eq(schema.rooms.is_deleted, false),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ConflictException('Room not found');
  }
  return row.travel_group_id;
}
