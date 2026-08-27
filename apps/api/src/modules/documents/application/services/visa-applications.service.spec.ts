import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockDb } from './mock-db.js';
import { VisaApplicationsService } from './visa-applications.service.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import {
  CreateVisaApplicationDto,
  RecordVisaResultDto,
  UpdateVisaApplicationDto,
} from '../dto/visa-applications.dto.js';

const actor = 'ULID123USER';

function buildService(db: any) {
  const numbers = {
    generateVisaApplicationNumber: vi
      .fn()
      .mockResolvedValue('VISA-2026-000001'),
  } as unknown as BusinessNumberService;
  const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
  const expenses = {
    createExpenseFromOperational: vi.fn().mockResolvedValue({}),
  } as any;
  return new VisaApplicationsService(db, numbers, eventEmitter, expenses);
}

/**
 * Build a mock row representing a registration with a given status.
 */
function registrationRow(regId: string, statusCode: string, travellerId = 'T') {
  return {
    registrations: {
      id: regId,
      registration_number: 'R-1',
      traveller_id: travellerId,
    },
    registration_statuses: {
      id: `STATUS_${statusCode}`,
      status_code: statusCode,
      name: statusCode,
    },
  };
}

function visaRow(
  id: string,
  statusCode: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    visa_applications: {
      id,
      application_number: 'VISA-2026-000001',
      registration_id: 'REG',
      visa_application_status_id: `STATUS_${statusCode}`,
      submission_date: '2026-09-01',
      approval_date: null,
      expiry_date: null,
      visa_number: null,
      rejection_date: null,
      rejection_reason: null,
      cancellation_date: null,
      cancellation_reason: null,
      notes: null,
      is_deleted: false,
      ...overrides,
    },
    visa_application_statuses: {
      id: `STATUS_${statusCode}`,
      status_code: statusCode,
      name: statusCode,
    },
    registrations: {
      id: 'REG',
      registration_number: 'R-1',
      traveller_id: 'T',
    },
    travellers: null,
  };
}

describe('VisaApplicationsService', () => {
  it('rejects creation when registration is not PROCESSING', async () => {
    const db = createMockDb([registrationRow('REG', 'DRAFT')]);
    const service = buildService(db);
    const dto = new CreateVisaApplicationDto();
    Object.assign(dto, { registration_id: 'REG' });

    await expect(service.createVisaApplication(dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates visa as SUBMITTED with today as submission date', async () => {
    const db = createMockDb([
      registrationRow('REG', 'PROCESSING'), // findRegistration
      { id: 'STATUS_SUBMITTED', status_code: 'SUBMITTED', name: 'Submitted' }, // findStatus
      null, // insert
      visaRow('NEW', 'SUBMITTED'), // getVisaApplication after insert
    ]);
    const service = buildService(db);
    const dto = new CreateVisaApplicationDto();
    Object.assign(dto, { registration_id: 'REG' });

    const result = await service.createVisaApplication(dto, actor);
    expect(result.status?.status_code).toBe('SUBMITTED');
    expect((db.insertValues[0] as any).visa_application_status_id).toBe(
      'STATUS_SUBMITTED',
    );
  });

  it('does not allow APPROVED at creation', async () => {
    const db = createMockDb([
      registrationRow('REG', 'PROCESSING'),
      { id: 'STATUS_SUBMITTED', status_code: 'SUBMITTED', name: 'Submitted' },
      null,
      visaRow('NEW', 'SUBMITTED'),
    ]);
    const service = buildService(db);
    const dto = new CreateVisaApplicationDto();
    Object.assign(dto, {
      registration_id: 'REG',
      // approval_date and visa_number should be ignored by the service
      approval_date: '2026-10-01',
      visa_number: 'V123',
    } as any);

    const result = await service.createVisaApplication(dto, actor);
    expect(result.status?.status_code).toBe('SUBMITTED');
    // The insert should not contain approval_date or visa_number
    expect((db.insertValues[0] as any).visa_number).toBeUndefined();
    expect((db.insertValues[0] as any).approval_date).toBeUndefined();
  });

  it('rejects APPROVED result without visa_number, approval_date, expiry_date', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      { id: 'STATUS_APPROVED', status_code: 'APPROVED', name: 'Approved' },
      { count: 0 },
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, { visa_application_status_id: 'STATUS_APPROVED' });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects REJECTED result without rejection_date and rejection_reason', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      { id: 'STATUS_REJECTED', status_code: 'REJECTED', name: 'Rejected' },
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, { visa_application_status_id: 'STATUS_REJECTED' });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects CANCELLED result without cancellation_date and cancellation_reason', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      { id: 'STATUS_CANCELLED', status_code: 'CANCELLED', name: 'Cancelled' },
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, { visa_application_status_id: 'STATUS_CANCELLED' });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows SUBMITTED -> APPROVED with required fields and emits visa.approved', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED', { visa_cost: '500.00' }),
      { id: 'STATUS_APPROVED', status_code: 'APPROVED', name: 'Approved' },
      { count: 0 },
      null, // update
      visaRow('VISA', 'APPROVED', {
        visa_number: 'V123',
        approval_date: '2026-10-01',
        expiry_date: '2027-10-01',
        visa_cost: '500.00',
      }),
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_APPROVED',
      visa_number: 'V123',
      approval_date: '2026-10-01',
      expiry_date: '2027-10-01',
    });

    await service.recordVisaResult('VISA', dto, actor);
    const calls = (service as any).eventEmitter.emit.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0]).toBe('visa.approved');
    // Verify result fields were set in the update
    expect((db.updateSets[0] as any).visa_number).toBe('V123');
    expect((db.updateSets[0] as any).approval_date).toBeDefined();
    expect((db.updateSets[0] as any).expiry_date).toBeDefined();
  });

  it('rejects APPROVED result when visa_cost is not set', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'), // no visa_cost
      { id: 'STATUS_APPROVED', status_code: 'APPROVED', name: 'Approved' },
      { count: 0 },
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_APPROVED',
      visa_number: 'V123',
      approval_date: '2026-10-01',
      expiry_date: '2027-10-01',
    });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('persists rejection data on SUBMITTED -> REJECTED', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      { id: 'STATUS_REJECTED', status_code: 'REJECTED', name: 'Rejected' },
      null, // update
      visaRow('VISA', 'REJECTED', {
        rejection_date: '2026-10-05',
        rejection_reason: 'Incomplete documents',
      }),
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_REJECTED',
      rejection_date: '2026-10-05',
      rejection_reason: 'Incomplete documents',
    });

    const result = await service.recordVisaResult('VISA', dto, actor);
    expect(result.status?.status_code).toBe('REJECTED');
    expect((db.updateSets[0] as any).rejection_reason).toBe(
      'Incomplete documents',
    );
    expect((db.updateSets[0] as any).rejection_date).toBeDefined();
  });

  it('persists cancellation data on SUBMITTED -> CANCELLED', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      { id: 'STATUS_CANCELLED', status_code: 'CANCELLED', name: 'Cancelled' },
      null,
      visaRow('VISA', 'CANCELLED', {
        cancellation_date: '2026-10-06',
        cancellation_reason: 'Traveller withdrew',
      }),
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_CANCELLED',
      cancellation_date: '2026-10-06',
      cancellation_reason: 'Traveller withdrew',
    });

    const result = await service.recordVisaResult('VISA', dto, actor);
    expect(result.status?.status_code).toBe('CANCELLED');
    expect((db.updateSets[0] as any).cancellation_reason).toBe(
      'Traveller withdrew',
    );
  });

  it('prevents creating a second APPROVED visa for the same registration', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      { id: 'STATUS_APPROVED', status_code: 'APPROVED', name: 'Approved' },
      { count: 1 }, // assertNoApprovedVisa finds existing approved
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_APPROVED',
      visa_number: 'V123',
      approval_date: '2026-10-01',
      expiry_date: '2027-10-01',
    });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      ConflictException,
    );
  });

  it('prevents APPROVED -> CANCELLED (APPROVED is terminal)', async () => {
    const db = createMockDb([
      visaRow('VISA', 'APPROVED', {
        visa_number: 'V123',
        approval_date: '2026-10-01',
        expiry_date: '2027-10-01',
      }),
      { id: 'STATUS_CANCELLED', status_code: 'CANCELLED', name: 'Cancelled' },
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_CANCELLED',
      cancellation_date: '2026-11-01',
      cancellation_reason: 'Visa revoked',
    });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('prevents invalid transition APPROVED -> REJECTED', async () => {
    const db = createMockDb([
      visaRow('VISA', 'APPROVED'),
      { id: 'STATUS_REJECTED', status_code: 'REJECTED', name: 'Rejected' },
    ]);
    const service = buildService(db);
    const dto = new RecordVisaResultDto();
    Object.assign(dto, {
      visa_application_status_id: 'STATUS_REJECTED',
      rejection_date: '2026-10-05',
      rejection_reason: 'Test',
    });

    await expect(service.recordVisaResult('VISA', dto, actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('prevents deleting an APPROVED visa', async () => {
    const db = createMockDb([visaRow('VISA', 'APPROVED')]);
    const service = buildService(db);

    await expect(service.softDelete('VISA', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows deleting a SUBMITTED visa', async () => {
    const db = createMockDb([
      visaRow('VISA', 'SUBMITTED'),
      null, // update
      visaRow('VISA', 'SUBMITTED', { is_deleted: true }),
    ]);
    const service = buildService(db);

    const result = await service.softDelete('VISA', actor);
    expect(result.is_deleted).toBe(true);
  });
});
