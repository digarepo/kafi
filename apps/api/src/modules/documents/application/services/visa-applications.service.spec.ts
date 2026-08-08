import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockDb } from './mock-db.js';
import { VisaApplicationsService } from './visa-applications.service.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import {
  CreateVisaApplicationDto,
  UpdateVisaApplicationDto,
  ChangeVisaApplicationStatusDto,
} from '../dto/visa-applications.dto.js';

const actor = 'ULID123USER';

function buildService(db: any) {
  const numbers = {
    generateVisaApplicationNumber: vi
      .fn()
      .mockResolvedValue('VISA-2026-000001'),
  } as unknown as BusinessNumberService;
  const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
  return new VisaApplicationsService(db, numbers, eventEmitter);
}

describe('VisaApplicationsService', () => {
  it('rejects approval date before submission date', async () => {
    const db = createMockDb([]);
    const service = buildService(db);
    const dto = new CreateVisaApplicationDto();
    Object.assign(dto, {
      registration_id: 'REG',
      submission_date: '2026-10-10',
      approval_date: '2026-10-09',
    });

    await expect(service.createVisaApplication(dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects update with invalid date order', async () => {
    const db = createMockDb([
      {
        visaApplications: {
          id: 'VISA',
          application_number: 'VISA-2026-000001',
          registration_id: 'REG',
          visa_application_status_id: 'DRAFT',
          submission_date: '2026-10-10',
          approval_date: null,
          expiry_date: null,
          is_deleted: false,
        },
        visaApplicationStatuses: {
          id: 'DRAFT',
          status_code: 'DRAFT',
          name: 'Draft',
        },
        registrations: {
          id: 'REG',
          registration_number: 'R-1',
          traveller_id: 'T',
        },
        travellers: {
          id: 'T',
          first_name: 'A',
          last_name: 'B',
          traveller_number: 'T-1',
        },
      },
    ]);
    const service = buildService(db);
    const dto = new UpdateVisaApplicationDto();
    Object.assign(dto, {
      submission_date: '2026-10-10',
      approval_date: '2026-10-01',
    });

    await expect(
      service.updateVisaApplication('VISA', dto, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects creating a second APPROVED visa for the same registration', async () => {
    const db = createMockDb([
      { id: 'REG', registration_number: 'R-1', traveller_id: 'T' },
      { id: 'APPROVED_STATUS', status_code: 'APPROVED' },
      { count: 1 },
    ]);
    const service = buildService(db);
    const dto = new CreateVisaApplicationDto();
    Object.assign(dto, {
      registration_id: 'REG',
      visa_application_status_id: 'APPROVED_STATUS',
    });

    await expect(service.createVisaApplication(dto, actor)).rejects.toThrow(
      ConflictException,
    );
  });

  it('prevents DRAFT -> APPROVED transition', async () => {
    const db = createMockDb([
      {
        visaApplications: {
          id: 'VISA',
          application_number: 'VISA-2026-000001',
          registration_id: 'REG',
          visa_application_status_id: 'DRAFT',
          submission_date: null,
          approval_date: null,
          expiry_date: null,
          is_deleted: false,
        },
        visaApplicationStatuses: {
          id: 'DRAFT',
          status_code: 'DRAFT',
          name: 'Draft',
        },
        registrations: {
          id: 'REG',
          registration_number: 'R-1',
          traveller_id: 'T',
        },
        travellers: null,
      },
      { id: 'APPROVED_STATUS', status_code: 'APPROVED' },
      {
        visaApplications: {
          id: 'VISA',
          application_number: 'VISA-2026-000001',
          visa_application_status_id: 'APPROVED_STATUS',
          is_deleted: false,
        },
        visaApplicationStatuses: {
          id: 'APPROVED_STATUS',
          status_code: 'APPROVED',
          name: 'Approved',
        },
        registrations: {
          id: 'REG',
          registration_number: 'R-1',
          traveller_id: 'T',
        },
        travellers: null,
      },
      { count: 0 },
    ]);
    const service = buildService(db);
    const dto = new ChangeVisaApplicationStatusDto();
    Object.assign(dto, { visa_application_status_id: 'APPROVED_STATUS' });

    await expect(service.changeStatus('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows SUBMITTED -> APPROVED and emits visa.approved', async () => {
    const initial = {
      visaApplications: {
        id: 'VISA',
        application_number: 'VISA-2026-000001',
        registration_id: 'REG',
        visa_application_status_id: 'SUBMITTED',
        submission_date: '2026-09-01',
        approval_date: null,
        expiry_date: null,
        is_deleted: false,
      },
      visaApplicationStatuses: {
        id: 'SUBMITTED',
        status_code: 'SUBMITTED',
        name: 'Submitted',
      },
      registrations: {
        id: 'REG',
        registration_number: 'R-1',
        traveller_id: 'T',
      },
      travellers: null,
    };
    const approved = {
      visaApplications: {
        id: 'VISA',
        application_number: 'VISA-2026-000001',
        visa_application_status_id: 'APPROVED_STATUS',
        is_deleted: false,
      },
      visaApplicationStatuses: {
        id: 'APPROVED_STATUS',
        status_code: 'APPROVED',
        name: 'Approved',
      },
      registrations: {
        id: 'REG',
        registration_number: 'R-1',
        traveller_id: 'T',
      },
      travellers: null,
    };
    const db = createMockDb([
      initial,
      { id: 'APPROVED_STATUS', status_code: 'APPROVED' },
      { count: 0 },
      null,
      approved,
    ]);
    const service = buildService(db);
    const dto = new ChangeVisaApplicationStatusDto();
    Object.assign(dto, { visa_application_status_id: 'APPROVED_STATUS' });

    await service.changeStatus('VISA', dto, actor);
    const calls = (service as any).eventEmitter.emit.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe('visa.approved');
  });

  it('prevents deleting an APPROVED visa', async () => {
    const db = createMockDb([
      {
        visaApplications: {
          id: 'VISA',
          application_number: 'VISA-2026-000001',
          registration_id: 'REG',
          visa_application_status_id: 'APPROVED',
          is_deleted: false,
        },
        visaApplicationStatuses: {
          id: 'APPROVED',
          status_code: 'APPROVED',
          name: 'Approved',
        },
        registrations: {
          id: 'REG',
          registration_number: 'R-1',
          traveller_id: 'T',
        },
        travellers: null,
      },
    ]);
    const service = buildService(db);

    await expect(service.softDelete('VISA', actor)).rejects.toThrow(
      BadRequestException,
    );
  });
});
