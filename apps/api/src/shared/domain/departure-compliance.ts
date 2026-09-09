/** Operational thresholds for return-departure monitoring. */
export const DEPARTURE_WARNING_DAYS = 7;
export const DEPARTURE_UPCOMING_DAYS = 14;

export type DepartureComplianceStatus =
  | 'NO_RETURN_FLIGHT'
  | 'VISA_EXPIRES_BEFORE_RETURN'
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'UPCOMING'
  | 'ON_SCHEDULE';

export interface DepartureComplianceInput {
  visaExpiryDate?: string | Date | null;
  plannedDepartureDate?: string | Date | null;
  actualDepartureDate?: string | Date | null;
}

export interface DepartureCompliance {
  status: DepartureComplianceStatus;
  visa_expiry_date: string | null;
  planned_departure_date: string | null;
  actual_departure_date: string | null;
  days_remaining: number | null;
  days_overdue: number | null;
}

function toDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function calendarDaysBetween(target: string, today = new Date()): number {
  const todayKey = today.toISOString().slice(0, 10);
  return Math.round(
    (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * Calculates operational departure risk from date-only business values.
 *
 * Visa expiry and planned return are intentionally kept separate: the return
 * flight is the operational departure deadline, while visa expiry is the legal
 * maximum and can invalidate a planned return date that is later than it.
 *
 * @param input - Approved visa, confirmed return flight, and optional actual departure dates.
 * @param today - Reference date used for deterministic countdown calculations.
 * @returns The derived compliance status and calendar-day countdown.
 *
 * @example
 * ```ts
 * calculateDepartureCompliance({ plannedDepartureDate: '2026-09-20' });
 * ```
 */
export function calculateDepartureCompliance(
  input: DepartureComplianceInput,
  today = new Date(),
): DepartureCompliance {
  const visaExpiryDate = toDateKey(input.visaExpiryDate);
  const plannedDepartureDate = toDateKey(input.plannedDepartureDate);
  const actualDepartureDate = toDateKey(input.actualDepartureDate);

  if (actualDepartureDate) {
    return {
      status: 'ON_SCHEDULE',
      visa_expiry_date: visaExpiryDate,
      planned_departure_date: plannedDepartureDate,
      actual_departure_date: actualDepartureDate,
      days_remaining: null,
      days_overdue: null,
    };
  }

  if (!plannedDepartureDate) {
    return {
      status: 'NO_RETURN_FLIGHT',
      visa_expiry_date: visaExpiryDate,
      planned_departure_date: null,
      actual_departure_date: null,
      days_remaining: null,
      days_overdue: null,
    };
  }

  if (visaExpiryDate && plannedDepartureDate > visaExpiryDate) {
    return {
      status: 'VISA_EXPIRES_BEFORE_RETURN',
      visa_expiry_date: visaExpiryDate,
      planned_departure_date: plannedDepartureDate,
      actual_departure_date: null,
      days_remaining: calendarDaysBetween(plannedDepartureDate, today),
      days_overdue: null,
    };
  }

  const daysRemaining = calendarDaysBetween(plannedDepartureDate, today);
  const status: DepartureComplianceStatus =
    daysRemaining < 0
      ? 'OVERDUE'
      : daysRemaining === 0
        ? 'DUE_TODAY'
        : daysRemaining <= DEPARTURE_WARNING_DAYS
          ? 'DUE_SOON'
          : daysRemaining <= DEPARTURE_UPCOMING_DAYS
            ? 'UPCOMING'
            : 'ON_SCHEDULE';

  return {
    status,
    visa_expiry_date: visaExpiryDate,
    planned_departure_date: plannedDepartureDate,
    actual_departure_date: null,
    days_remaining: daysRemaining,
    days_overdue: daysRemaining < 0 ? Math.abs(daysRemaining) : null,
  };
}
