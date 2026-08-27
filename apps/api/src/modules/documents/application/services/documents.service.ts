import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
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
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_SIZE,
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
          like(schema.documents.display_name, term),
          like(schema.documents.original_filename, term),
          like(schema.travellers.traveller_number, term),
          like(schema.travellers.last_name, term),
          like(schema.travellers.first_name, term),
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
        .leftJoin(
          schema.travellers,
          eq(schema.documents.traveller_id, schema.travellers.id),
        )
        .leftJoin(
          schema.registrations,
          eq(schema.documents.registration_id, schema.registrations.id),
        )
        .where(and(...conditions)!)
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
    this.validateFile(file);
    await this.validateOwnerReferences(dto);

    const documentType = await this.findDocumentType(dto.document_type_id);
    if (!documentType) throw new NotFoundException('Document type not found');

    const [pendingStatus, pendingVerification] = await Promise.all([
      this.findStatus(schema.documentStatuses, 'PENDING'),
      this.findStatus(schema.verificationStatuses, 'PENDING'),
    ]);

    const id = ulid();
    const documentNumber = await this.numbers.generateDocumentNumber();
    const originalFilename = this.sanitizeOriginalFilename(file.originalname);
    const storageKey = this.generateStorageKey(id, originalFilename);
    const storagePath = await this.storage.save(file.buffer, storageKey);

    const owner = await this.resolveDocumentOwner(dto);
    const displayName = this.generateDisplayName(
      owner.first_name,
      documentType.type_code,
    );

    await this.db.insert(schema.documents).values({
      id,
      document_number: documentNumber,
      display_name: displayName,
      traveller_id: dto.traveller_id ?? null,
      registration_id: dto.registration_id ?? null,
      document_type_id: dto.document_type_id,
      original_filename: originalFilename,
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

    return { id, is_deleted: true };
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

  async attachDocumentToRegistration(
    documentId: string,
    registrationId: string,
    actorId: string,
  ) {
    const [document] = await this.db
      .select({
        id: schema.documents.id,
        traveller_id: schema.documents.traveller_id,
        registration_id: schema.documents.registration_id,
      })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, documentId),
          eq(schema.documents.is_deleted, false),
        ),
      )
      .limit(1);
    if (!document) throw new NotFoundException('Document not found');

    const [registration] = await this.db
      .select({
        id: schema.registrations.id,
        traveller_id: schema.registrations.traveller_id,
      })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);
    if (!registration) throw new BadRequestException('Registration not found');

    if (document.traveller_id !== registration.traveller_id) {
      throw new BadRequestException(
        "Document does not belong to the registration's traveller",
      );
    }
    if (
      document.registration_id &&
      document.registration_id !== registration.id
    ) {
      throw new ConflictException(
        'Document is already attached to another registration',
      );
    }

    await this.db
      .update(schema.documents)
      .set({
        registration_id: registration.id,
        updated_by: actorId,
        updated_at: new Date(),
      })
      .where(eq(schema.documents.id, document.id));

    return this.getDocument(document.id);
  }

  private async resolveDocumentOwner(dto: {
    traveller_id?: string | null;
    registration_id?: string | null;
  }) {
    if (dto.traveller_id) {
      const [traveller] = await this.db
        .select({ first_name: schema.travellers.first_name })
        .from(schema.travellers)
        .where(
          and(
            eq(schema.travellers.id, dto.traveller_id),
            eq(schema.travellers.is_deleted, false),
          ),
        )
        .limit(1);
      if (traveller) return { first_name: traveller.first_name ?? 'Unknown' };
    }

    if (dto.registration_id) {
      const [registration] = await this.db
        .select({
          first_name: schema.travellers.first_name,
        })
        .from(schema.registrations)
        .innerJoin(
          schema.travellers,
          eq(schema.registrations.traveller_id, schema.travellers.id),
        )
        .where(
          and(
            eq(schema.registrations.id, dto.registration_id),
            eq(schema.registrations.is_deleted, false),
            eq(schema.travellers.is_deleted, false),
          ),
        )
        .limit(1);
      if (registration)
        return { first_name: registration.first_name ?? 'Unknown' };
    }

    return { first_name: 'Unknown' };
  }

  private generateDisplayName(firstName: string, documentTypeCode: string) {
    const safeFirst = firstName.replace(/[^a-zA-Z0-9]/g, '');
    const safeType = documentTypeCode.replace(/[^a-zA-Z0-9]/g, '');
    const shortId = randomBytes(2).toString('hex').toUpperCase();
    return `${safeFirst}_${safeType}_${shortId}`;
  }

  // ---- Private helpers ----

  private validateFile(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > DOCUMENT_MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 5 MB');
    }
    const extension = extname(file.originalname).toLowerCase();
    if (
      !DOCUMENT_ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof DOCUMENT_ALLOWED_MIME_TYPES)[number],
      ) ||
      !DOCUMENT_ALLOWED_EXTENSIONS.includes(
        extension as (typeof DOCUMENT_ALLOWED_EXTENSIONS)[number],
      )
    ) {
      throw new BadRequestException(
        'Only PDF, JPG, and JPEG files are allowed',
      );
    }

    const isPdf =
      file.mimetype === 'application/pdf' &&
      file.buffer.subarray(0, 5).toString() === '%PDF-';
    const isJpeg =
      file.mimetype === 'image/jpeg' &&
      file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (!isPdf && !isJpeg) {
      throw new BadRequestException(
        'File content does not match its declared type',
      );
    }
  }

  private async validateOwnerReferences(dto: {
    traveller_id?: string | null;
    registration_id?: string | null;
  }) {
    if (dto.traveller_id) {
      const [traveller] = await this.db
        .select({ id: schema.travellers.id })
        .from(schema.travellers)
        .where(
          and(
            eq(schema.travellers.id, dto.traveller_id),
            eq(schema.travellers.is_deleted, false),
          ),
        )
        .limit(1);
      if (!traveller) throw new BadRequestException('Traveller not found');
    }

    if (dto.registration_id) {
      const [registration] = await this.db
        .select({
          id: schema.registrations.id,
          traveller_id: schema.registrations.traveller_id,
        })
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.id, dto.registration_id),
            eq(schema.registrations.is_deleted, false),
          ),
        )
        .limit(1);
      if (!registration)
        throw new BadRequestException('Registration not found');
      if (dto.traveller_id && registration.traveller_id !== dto.traveller_id) {
        throw new BadRequestException(
          'Registration does not belong to traveller',
        );
      }
    }
  }

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

  private sanitizeOriginalFilename(originalName: string) {
    return originalName.replace(/[^a-zA-Z0-9_. -]/g, '_').slice(0, 255);
  }

  private generateStorageKey(id: string, originalName: string) {
    return `DOC-${id}-${originalName}`;
  }

  private mapListRow(row: any) {
    const document = row.documents;
    return {
      id: document.id,
      document_number: document.document_number,
      display_name: document.display_name,
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
      document_type: row.document_types
        ? {
            id: row.document_types.id,
            type_code: row.document_types.type_code,
            name: row.document_types.name,
          }
        : null,
      document_status: row.document_statuses
        ? {
            id: row.document_statuses.id,
            status_code: row.document_statuses.status_code,
            name: row.document_statuses.name,
          }
        : null,
      verification_status: row.verification_statuses
        ? {
            id: row.verification_statuses.id,
            status_code: row.verification_statuses.status_code,
            name: row.verification_statuses.name,
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
      display_name: document.display_name,
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
      document_type: row.document_types
        ? {
            id: row.document_types.id,
            type_code: row.document_types.type_code,
            name: row.document_types.name,
          }
        : null,
      document_status: row.document_statuses
        ? {
            id: row.document_statuses.id,
            status_code: row.document_statuses.status_code,
            name: row.document_statuses.name,
          }
        : null,
      verification_status: row.verification_statuses
        ? {
            id: row.verification_statuses.id,
            status_code: row.verification_statuses.status_code,
            name: row.verification_statuses.name,
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
