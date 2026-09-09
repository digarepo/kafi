import { describe, expect, it } from 'vitest';
import { calculateDepartureCompliance } from './departure-compliance.js';

describe('calculateDepartureCompliance', () => {
  const today = new Date('2026-09-01T12:00:00Z');

  it('reports the planned return countdown', () => {
    expect(
      calculateDepartureCompliance(
        {
          visaExpiryDate: '2027-09-20',
          plannedDepartureDate: '2026-09-08',
        },
        today,
      ),
    ).toMatchObject({ status: 'DUE_SOON', days_remaining: 7 });
  });

  it('flags a return date after visa expiry', () => {
    expect(
      calculateDepartureCompliance(
        {
          visaExpiryDate: '2026-09-20',
          plannedDepartureDate: '2026-09-30',
        },
        today,
      ).status,
    ).toBe('VISA_EXPIRES_BEFORE_RETURN');
  });

  it('flags overdue planned departures', () => {
    expect(
      calculateDepartureCompliance(
        {
          visaExpiryDate: '2027-09-20',
          plannedDepartureDate: '2026-08-30',
        },
        today,
      ),
    ).toMatchObject({ status: 'OVERDUE', days_overdue: 2 });
  });

  it('reports missing return flights separately', () => {
    expect(
      calculateDepartureCompliance({ visaExpiryDate: '2027-09-20' }, today).status,
    ).toBe('NO_RETURN_FLIGHT');
  });
});
