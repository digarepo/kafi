import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { createMockDb } from './mock-db.js';
import { DocumentsService } from './documents.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { STORAGE_PROVIDER } from '../../infrastructure/storage/storage-provider.token.js';
import { CreateDocumentDto, UpdateDocumentDto } from '../dto/documents.dto.js';

function buildService(db: any) {
  const numbers = {
    generateDocumentNumber: vi.fn().mockResolvedValue('DOC-2026-000001'),
  } as any;
  const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
  const storage = {
    save: vi.fn().mockResolvedValue('DOC-ULID-passport.pdf'),
    read: vi.fn().mockResolvedValue(Buffer.from('file-content')),
  };

  return new DocumentsService(db, numbers, eventEmitter, storage);
}

const actor = 'ULID123USER';
const file = {
  buffer: Buffer.from('%PDF-1.7\n'),
  mimetype: 'application/pdf',
  originalname: 'passport.pdf',
  size: 1234,
};

const okFile = {
  buffer: Buffer.from('%PDF-1.7\n'),
  mimetype: 'application/pdf',
  originalname: 'passport.pdf',
  size: 1234,
};

describe('DocumentsService', () => {
  it('rejects upload with no owner', async () => {
    const db = createMockDb([]);
    const service = buildService(db);
    const dto = new CreateDocumentDto();
    Object.assign(dto, {
      document_type_id: 'DOC_TYPE',
      traveller_id: undefined,
      registration_id: undefined,
    });

    await expect(service.createDocument(dto, file, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects unsupported file types', async () => {
    const service = buildService(createMockDb([]));
    const dto = new CreateDocumentDto();
    Object.assign(dto, {
      document_type_id: 'DOC_TYPE',
      traveller_id: 'TRAVELER',
    });

    await expect(
      service.createDocument(
        dto,
        {
          ...file,
          buffer: Buffer.from('not-a-png'),
          mimetype: 'image/png',
          originalname: 'file.png',
        },
        actor,
      ),
    ).rejects.toThrow('Only PDF, JPG, and JPEG files are allowed');
  });

  it('rejects files larger than 5 MB', async () => {
    const service = buildService(createMockDb([]));
    const dto = new CreateDocumentDto();
    Object.assign(dto, {
      document_type_id: 'DOC_TYPE',
      traveller_id: 'TRAVELER',
    });

    await expect(
      service.createDocument(
        dto,
        { ...file, size: 5 * 1024 * 1024 + 1 },
        actor,
      ),
    ).rejects.toThrow('File size must not exceed 5 MB');
  });

  it('rejects upload when file size is negative', async () => {
    const db = createMockDb([
      { id: 'DOC_TYPE', type_code: 'PASSPORT', name: 'Passport' },
      { id: 'STATUS', status_code: 'PENDING' },
    ]);
    const service = buildService(db);
    const dto = new CreateDocumentDto();
    Object.assign(dto, {
      document_type_id: 'DOC_TYPE',
      traveller_id: 'TRAVELER',
    });
    const badFile = { ...file, size: -1 };

    await expect(service.createDocument(dto, badFile, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a document with a traveller owner', async () => {
    const db = createMockDb([
      { id: 'TRAVELER' },
      { id: 'DOC_TYPE', type_code: 'PASSPORT', name: 'Passport' },
      { id: 'DOC_STATUS', status_code: 'PENDING' },
      { id: 'VER_STATUS', status_code: 'PENDING' },
      { first_name: 'Abebe' },
      null,
      {
        documents: {
          id: 'DOCID',
          document_number: 'DOC-2026-000001',
          display_name: 'Abebe_PASSPORT_ABCD',
          traveller_id: 'TRAVELER',
          document_type_id: 'DOC_TYPE',
          document_status_id: 'DOC_STATUS',
          verification_status_id: 'VER_STATUS',
          original_filename: 'passport.pdf',
          stored_filename: 'DOC-DOCID-passport.pdf',
          mime_type: 'application/pdf',
          file_size: 1234,
          storage_path: 'DOC-DOCID-passport.pdf',
          expiry_date: null,
          remarks: null,
          created_at: new Date(),
          updated_at: new Date(),
          is_deleted: false,
        },
        documentTypes: {
          id: 'DOC_TYPE',
          type_code: 'PASSPORT',
          name: 'Passport',
        },
        documentStatuses: {
          id: 'DOC_STATUS',
          status_code: 'PENDING',
          name: 'Pending',
        },
        verificationStatuses: {
          id: 'VER_STATUS',
          status_code: 'PENDING',
          name: 'Pending',
        },
        travellers: {
          id: 'TRAVELER',
          first_name: 'Abebe',
          last_name: 'Kebede',
          traveller_number: 'T-001',
        },
        users: null,
      },
    ]);
    const service = buildService(db);
    const dto = new CreateDocumentDto();
    Object.assign(dto, {
      document_type_id: 'DOC_TYPE',
      traveller_id: 'TRAVELER',
      expiry_date: '2026-12-31',
      remarks: 'notes',
    });

    const result = await service.createDocument(dto, okFile, actor);
    expect(result.document_number).toBe('DOC-2026-000001');
    expect(result.traveller?.id).toBe('TRAVELER');
    expect(result.display_name).toMatch(/^Abebe_PASSPORT_[A-Z0-9]{4}$/);
    const insert = (db as any).insertValues[0];
    expect(insert.display_name).toMatch(/^Abebe_PASSPORT_[A-Z0-9]{4}$/);
  });

  it('emits a verified event when verification becomes VERIFIED', async () => {
    const nested = {
      documents: {
        id: 'DOCID',
        document_number: 'DOC-2026-000001',
        traveller_id: 'TRAVELER',
        registration_id: null,
        document_type_id: 'TYPE',
        document_status_id: 'DS',
        verification_status_id: 'VER_STATUS',
        original_filename: 'x.pdf',
        stored_filename: 'x',
        mime_type: 'pdf',
        file_size: 1,
        storage_path: 'x',
        expiry_date: null,
        remarks: null,
        verified_by: 'USER',
        verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      },
      documentTypes: null,
      documentStatuses: { id: 'DS', status_code: 'PENDING', name: 'Pending' },
      verificationStatuses: {
        id: 'VER_STATUS',
        status_code: 'VERIFIED',
        name: 'Verified',
      },
      travellers: {
        id: 'TRAVELER',
        first_name: 'A',
        last_name: 'B',
        traveller_number: 'T-1',
      },
      users: { id: 'USER', full_name: 'Staff' },
    };
    const db = createMockDb([
      nested,
      { id: 'VER_STATUS', status_code: 'VERIFIED' },
      null,
      nested,
    ]);
    const service = buildService(db);
    const dto = { verification_status_id: 'VER_STATUS' } as any;

    await service.changeVerification('DOCID', dto, actor);
    const calls = (service as any).eventEmitter.emit.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe('documents.verified');
  });

  it('populates verified_by and verified_at for VERIFIED status', async () => {
    const nested = {
      documents: {
        id: 'DOCID',
        document_number: 'DOC-2026-000001',
        verification_status_id: 'VER_STATUS',
        verified_by: actor,
        verified_at: new Date(),
        is_deleted: false,
      },
      documentTypes: null,
      documentStatuses: { id: 'DS', status_code: 'PENDING', name: 'Pending' },
      verificationStatuses: {
        id: 'VER_STATUS',
        status_code: 'VERIFIED',
        name: 'Verified',
      },
      travellers: null,
      users: { id: actor, full_name: 'Staff' },
    };
    const db = createMockDb([
      nested,
      { id: 'VER_STATUS', status_code: 'VERIFIED' },
      null,
      nested,
    ]);
    const service = buildService(db);
    const dto = { verification_status_id: 'VER_STATUS' } as any;

    const result = (await service.changeVerification(
      'DOCID',
      dto,
      actor,
    )) as any;
    expect(result.verified_by).not.toBeNull();
  });

  it('returns file buffer on download', async () => {
    const db = createMockDb([
      {
        documents: {
          id: 'DOCID',
          storage_path: 'DOC-DOCID-passport.pdf',
          mime_type: 'application/pdf',
          original_filename: 'passport.pdf',
          is_deleted: false,
        },
      },
    ]);
    const service = buildService(db);
    const result = await service.download('DOCID');
    expect(result.buffer.toString()).toBe('file-content');
    expect(result.original_filename).toBe('passport.pdf');
  });

  it('attaches an existing traveller document to a registration', async () => {
    const documentRow = {
      id: 'DOCID',
      traveller_id: 'TRAVELER',
      registration_id: null,
      is_deleted: false,
    };
    const bigRow = {
      documents: {
        id: 'DOCID',
        document_number: 'DOC-2026-000001',
        display_name: 'Abebe_PASSPORT_0000',
        traveller_id: 'TRAVELER',
        registration_id: 'REGID',
        document_type_id: 'DOC_TYPE',
        document_status_id: 'DS',
        verification_status_id: 'VER_STATUS',
        original_filename: 'passport.pdf',
        stored_filename: 'DOC-DOCID-passport.pdf',
        mime_type: 'application/pdf',
        file_size: 1234,
        storage_path: 'DOC-DOCID-passport.pdf',
        expiry_date: null,
        remarks: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      },
      documentTypes: {
        id: 'DOC_TYPE',
        type_code: 'PASSPORT',
        name: 'Passport',
      },
      documentStatuses: { id: 'DS', status_code: 'PENDING', name: 'Pending' },
      verificationStatuses: {
        id: 'VER_STATUS',
        status_code: 'PENDING',
        name: 'Pending',
      },
      travellers: {
        id: 'TRAVELER',
        first_name: 'Abebe',
        last_name: 'Kebede',
        traveller_number: 'T-001',
      },
      registrations: { id: 'REGID', registration_number: 'R-001' },
      users: null,
    };
    const db = createMockDb([
      documentRow,
      { id: 'REGID', traveller_id: 'TRAVELER' },
      null,
      bigRow,
    ]);
    const service = buildService(db);

    const result = await service.attachDocumentToRegistration(
      'DOCID',
      'REGID',
      actor,
    );
    expect(result.registration?.id).toBe('REGID');
  });
});
