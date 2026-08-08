import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import * as schema from '@kafi/database';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '../../infrastructure/storage/storage-provider.token.js';
import { createDocumentVerifiedEvent } from '../../domain/events/document-verified.event.js';
import {
  ChangeDocumentStatusDto,
  ChangeDocumentVerificationDto,
  CreateDocumentDto,
  DocumentFiltersDto,
  UpdateDocumentDto,
} from '../dto/documents.dto.js';

function toDateOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function isPastDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  // ---- Lookups ----

  async listDocumentTypes() {
    return this.db
      .select()
      .from(schema.documentTypes)
      .where(eq(schema.documentTypes.is_deleted, false))
      .orderBy(asc(schema.documentTypes.name));
  }

  async listDocumentStatuses() {
    return this.db
      .select()
      .from(schema.documentStatuses)
      .where(eq(schema.documentStatuses.is_deleted, false))
      .orderBy(asc(schema.documentStatuses.display_order));
  }

  async listVerificationStatuses() {
    return this.db
      .select()
      .from(schema.verificationStatuses)
      .where(eq(schema.verificationStatuses.is_deleted, false))
      .orderBy(asc(schema.verificationStatuses.display_order));
  }

  // ---- List / view ----

  async listDocuments(filters: DocumentFiltersDto) {
    const conditions = [eq(schema.documents.is_deleted, false)];

    if (filters.traveller_id) {
      conditions.push(eq(schema.documents.traveller_id, filters.traveller_id));
    }
    if (filters.registration_id) {
      conditions.push(
        eq(schema.documents.registration_id, filters.registration_id),
      );
    }
    if (filters.document_type_id) {
      conditions.push(
        eq(schema.documents.document_type_id, filters.document_type_id),
      );
    }
    if (filters.document_status_id) {
      conditions.push(
        eq(schema.documents.document_status_id, filters.document_status_id),
      );
    }
    if (filters.verification_status_id) {
      conditions.push(
        eq(
          schema.documents.verification_status_id,
          filters.verification_status_id,
        ),
      );
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.documents.document_number, term),
          like(schema.documents.original_filename, term),
          like(schema.travellers.traveller_number, term),
          like(schema.travellers.last_name, term),
          like(schema.registrations.registration_number, term),
        )!,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.documents)
        .leftJoin(
          schema.documentTypes,
          eq(schema.documents.document_type_id, schema.documentTypes.id),
        )
        .leftJoin(
          schema.documentStatuses,
          eq(schema.documents.document_status_id, schema.documentStatuses.id),
        )
        .leftJoin(
          schema.verificationStatuses,
          eq(
            schema.documents.verification_status_id,
            schema.verificationStatuses.id,
          ),
        )
        .leftJoin(
          schema.travellers,
          eq(schema.documents.traveller_id, schema.travellers.id),
        )
        .leftJoin(
          schema.registrations,
          eq(schema.documents.registration_id, schema.registrations.id),
        )
        .where(and(...conditions)!)
        .orderBy(desc(schema.documents.created_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.documents)
        .where(eq(schema.documents.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((row) => this.mapListRow(row)),
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getDocument(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.documents)
      .leftJoin(
        schema.documentTypes,
        eq(schema.documents.document_type_id, schema.documentTypes.id),
      )
      .leftJoin(
        schema.documentStatuses,
        eq(schema.documents.document_status_id, schema.documentStatuses.id),
      )
      .leftJoin(
        schema.verificationStatuses,
        eq(
          schema.documents.verification_status_id,
          schema.verificationStatuses.id,
        ),
      )
      .leftJoin(
        schema.travellers,
        eq(schema.documents.traveller_id, schema.travellers.id),
      )
      .leftJoin(
        schema.registrations,
        eq(schema.documents.registration_id, schema.registrations.id),
      )
      .leftJoin(schema.users, eq(schema.documents.verified_by, schema.users.id))
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Document not found');
    return this.mapDetailRow(row);
  }

  // ---- Mutations ----

  async createDocument(
    dto: CreateDocumentDto,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    actorId: string,
  ) {
    this.assertOwner(dto);
    if (!file) throw new BadRequestException('File is required');
    if (file.size < 0)
      throw new BadRequestException('File size must be non-negative');

    const documentType = await this.findDocumentType(dto.document_type_id);
    if (!documentType) throw new NotFoundException('Document type not found');

    const [pendingStatus, pendingVerification] = await Promise.all([
      this.findStatus(schema.documentStatuses, 'PENDING'),
      this.findStatus(schema.verificationStatuses, 'PENDING'),
    ]);

    const id = ulid();
    const documentNumber = await this.numbers.generateDocumentNumber();
    const storageKey = this.generateStorageKey(id, file.originalname);
    const storagePath = await this.storage.save(file.buffer, storageKey);

    await this.db.insert(schema.documents).values({
      id,
      document_number: documentNumber,
      traveller_id: dto.traveller_id ?? null,
      registration_id: dto.registration_id ?? null,
      document_type_id: dto.document_type_id,
      original_filename: file.originalname,
      stored_filename: storageKey,
      mime_type: file.mimetype,
      file_size: file.size,
      storage_path: storagePath,
      verification_status_id: pendingVerification.id,
      verified_by: null,
      verified_at: null,
      expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
      document_status_id: pendingStatus.id,
      remarks: dto.remarks ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getDocument(id);
  }

  async updateDocument(id: string, dto: UpdateDocumentDto, actorId: string) {
    const existing = await this.getDocument(id);
    if (existing.is_deleted) throw new NotFoundException('Document not found');

    const set: any = {
      updated_by: actorId,
    };
    if (dto.document_type_id !== undefined) {
      const documentType = await this.findDocumentType(dto.document_type_id);
      if (!documentType) throw new NotFoundException('Document type not found');
      set.document_type_id = dto.document_type_id;
    }
    if (dto.traveller_id !== undefined)
      set.traveller_id = dto.traveller_id ?? null;
    if (dto.registration_id !== undefined)
      set.registration_id = dto.registration_id ?? null;
    if (dto.expiry_date !== undefined)
      set.expiry_date = dto.expiry_date ? new Date(dto.expiry_date) : null;
    if (dto.remarks !== undefined) set.remarks = dto.remarks ?? null;

    await this.db
      .update(schema.documents)
      .set(set)
      .where(eq(schema.documents.id, id));

    return this.getDocument(id);
  }

  async changeVerification(
    id: string,
    dto: ChangeDocumentVerificationDto,
    actorId: string,
  ) {
    const document = await this.getDocument(id);
    if (document.is_deleted) throw new NotFoundException('Document not found');

    const [status] = await this.db
      .select()
      .from(schema.verificationStatuses)
      .where(eq(schema.verificationStatuses.id, dto.verification_status_id))
      .limit(1);
    if (!status) throw new NotFoundException('Verification status not found');

    const isVerified = status.status_code === 'VERIFIED';
    await this.db
      .update(schema.documents)
      .set({
        verification_status_id: dto.verification_status_id,
        verified_by: isVerified ? actorId : null,
        verified_at: isVerified ? new Date() : null,
        updated_by: actorId,
      })
      .where(eq(schema.documents.id, id));

    if (isVerified) {
      this.eventEmitter.emit(
        'documents.verified',
        createDocumentVerifiedEvent({
          document_id: id,
          document_number: document.document_number,
          traveller_id: document.traveller?.id ?? null,
          registration_id: document.registration?.id ?? null,
        }),
      );
    }

    return this.getDocument(id);
  }

  async changeStatus(
    id: string,
    dto: ChangeDocumentStatusDto,
    actorId: string,
  ) {
    const document = await this.getDocument(id);
    if (document.is_deleted) throw new NotFoundException('Document not found');

    const [status] = await this.db
      .select()
      .from(schema.documentStatuses)
      .where(eq(schema.documentStatuses.id, dto.document_status_id))
      .limit(1);
    if (!status) throw new NotFoundException('Document status not found');

    await this.db
      .update(schema.documents)
      .set({
        document_status_id: dto.document_status_id,
        updated_by: actorId,
      })
      .where(eq(schema.documents.id, id));

    return this.getDocument(id);
  }

  async softDelete(id: string, actorId: string) {
    const document = await this.getDocument(id);
    if (document.is_deleted) throw new NotFoundException('Document not found');

    await this.db
      .update(schema.documents)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.documents.id, id));

    return this.getDocument(id);
  }

  async download(id: string) {
    const document = await this.getDocument(id);
    if (!document.storage_path) throw new NotFoundException('File not stored');
    const buffer = await this.storage.read(document.storage_path);
    return {
      buffer,
      mime_type: document.mime_type,
      original_filename: document.original_filename,
    };
  }

  // ---- Private helpers ----

  private assertOwner(dto: {
    traveller_id?: string | null;
    registration_id?: string | null;
  }) {
    if (!dto.traveller_id && !dto.registration_id) {
      throw new BadRequestException(
        'A document must be owned by a traveller or a registration',
      );
    }
  }

  private async findDocumentType(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.documentTypes)
      .where(eq(schema.documentTypes.id, id))
      .limit(1);
    return row;
  }

  private async findStatus(
    table: any,
    code: string,
  ): Promise<{ id: string; status_code: string }> {
    const [row] = await this.db
      .select()
      .from(table)
      .where(eq(table.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`${code} status not found`);
    return row as { id: string; status_code: string };
  }

  private generateStorageKey(id: string, originalName: string) {
    const safe = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `DOC-${id}-${safe}`;
  }

  private mapListRow(row: any) {
    const document = row.documents;
    return {
      id: document.id,
      document_number: document.document_number,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            traveller_number: row.travellers.traveller_number,
          }
        : null,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      document_type: row.documentTypes
        ? {
            id: row.documentTypes.id,
            type_code: row.documentTypes.type_code,
            name: row.documentTypes.name,
          }
        : null,
      document_status: row.documentStatuses
        ? {
            id: row.documentStatuses.id,
            status_code: row.documentStatuses.status_code,
            name: row.documentStatuses.name,
          }
        : null,
      verification_status: row.verificationStatuses
        ? {
            id: row.verificationStatuses.id,
            status_code: row.verificationStatuses.status_code,
            name: row.verificationStatuses.name,
          }
        : null,
      original_filename: document.original_filename,
      file_size: document.file_size,
      expiry_date: toDateOrNull(document.expiry_date),
      is_expired: isPastDate(document.expiry_date),
      created_at: document.created_at,
      updated_at: document.updated_at,
      is_deleted: document.is_deleted,
    };
  }

  private mapDetailRow(row: any) {
    const document = row.documents;
    return {
      id: document.id,
      document_number: document.document_number,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            traveller_number: row.travellers.traveller_number,
            phone_number: row.travellers.phone_number,
          }
        : null,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      document_type: row.documentTypes
        ? {
            id: row.documentTypes.id,
            type_code: row.documentTypes.type_code,
            name: row.documentTypes.name,
          }
        : null,
      document_status: row.documentStatuses
        ? {
            id: row.documentStatuses.id,
            status_code: row.documentStatuses.status_code,
            name: row.documentStatuses.name,
          }
        : null,
      verification_status: row.verificationStatuses
        ? {
            id: row.verificationStatuses.id,
            status_code: row.verificationStatuses.status_code,
            name: row.verificationStatuses.name,
          }
        : null,
      verified_by: row.users
        ? {
            id: row.users.id,
            full_name: row.users.full_name,
          }
        : null,
      verified_at: document.verified_at,
      original_filename: document.original_filename,
      stored_filename: document.stored_filename,
      mime_type: document.mime_type,
      file_size: document.file_size,
      storage_path: document.storage_path,
      expiry_date: toDateOrNull(document.expiry_date),
      is_expired: isPastDate(document.expiry_date),
      remarks: document.remarks,
      created_at: document.created_at,
      updated_at: document.updated_at,
      is_deleted: document.is_deleted,
    };
  }
}
