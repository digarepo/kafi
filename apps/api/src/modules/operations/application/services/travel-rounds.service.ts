import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import * as schema from '@kafi/database';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { CreateTravelRoundDto, UpdateTravelRoundDto, TravelRoundFiltersDto } from '../dto/operations.dto.js';

/** CRUD and lifecycle policy for registration travel rounds. */
@Injectable()
export class TravelRoundsService {
  constructor(@Inject(DATABASE) private readonly db: MySql2Database<typeof schema>) {}

  /** Lists non-deleted rounds with optional lifecycle/search filters. */
  async listTravelRounds(filters: TravelRoundFiltersDto) {
    const conditions = [eq(schema.travelRounds.is_deleted, false)];
    if (filters.status) conditions.push(eq(schema.travelRounds.status, filters.status));
    if (filters.search) conditions.push(like(schema.travelRounds.name, `%${filters.search}%`));
    const [data, count] = await Promise.all([
      this.db.select().from(schema.travelRounds).where(and(...conditions)).orderBy(desc(schema.travelRounds.departure_date)).limit(filters.page_size).offset((filters.page - 1) * filters.page_size),
      this.db.select({ count: sql<number>`count(*)` }).from(schema.travelRounds).where(and(...conditions)).then((rows) => rows[0]?.count ?? 0),
    ]);
    return { data, total: count, page: filters.page, page_size: filters.page_size };
  }

  /** Returns one round or throws when it is not visible. */
  async getTravelRound(id: string) {
    const [row] = await this.db.select().from(schema.travelRounds).where(and(eq(schema.travelRounds.id, id), eq(schema.travelRounds.is_deleted, false))).limit(1);
    if (!row) throw new NotFoundException('Travel round not found');
    return row;
  }

  /** Creates a round in PLANNING state. */
  async createTravelRound(dto: CreateTravelRoundDto, actorId: string) {
    if (dto.departure_date > dto.return_date) throw new BadRequestException('Return date must be on or after departure date');
    const id = ulid();
    await this.db.insert(schema.travelRounds).values({ id, round_number: dto.round_number, name: dto.name, departure_date: new Date(dto.departure_date), return_date: new Date(dto.return_date), status: dto.status ?? 'PLANNING', remarks: dto.remarks ?? null, created_by: actorId, updated_by: actorId });
    return this.getTravelRound(id);
  }

  /** Updates editable round fields while protecting rounds with registrations. */
  async updateTravelRound(id: string, dto: UpdateTravelRoundDto, actorId: string) {
    const existing = await this.getTravelRound(id);
    const departure = dto.departure_date ?? String(existing.departure_date).slice(0, 10);
    const returnDate = dto.return_date ?? String(existing.return_date).slice(0, 10);
    if (departure > returnDate) throw new BadRequestException('Return date must be on or after departure date');
    if (dto.status === 'PLANNING' && existing.status !== 'PLANNING') throw new ConflictException('A round cannot move back to planning');
    await this.db.update(schema.travelRounds).set({ ...dto, departure_date: new Date(departure), return_date: new Date(returnDate), updated_at: new Date(), updated_by: actorId }).where(eq(schema.travelRounds.id, id));
    return this.getTravelRound(id);
  }

  /** Soft-deletes an unused round. */
  async deleteTravelRound(id: string, actorId: string) {
    await this.getTravelRound(id);
    const [count] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.registrations).where(and(eq(schema.registrations.travel_round_id, id), eq(schema.registrations.is_deleted, false)));
    if (Number(count?.count ?? 0) > 0) throw new ConflictException('Cannot delete a round with registrations');
    await this.db.update(schema.travelRounds).set({ is_deleted: true, updated_at: new Date(), updated_by: actorId }).where(eq(schema.travelRounds.id, id));
    return { success: true };
  }
}
