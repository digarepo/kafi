# Departure Compliance Monitoring

## Purpose

Departure monitoring compares the approved visa expiry date with the planned return date on the confirmed flight. The return flight is the operational departure deadline; the visa expiry is the legal maximum and must remain a separate value.

## Derived statuses

- `NO_RETURN_FLIGHT`: no confirmed return flight is recorded.
- `VISA_EXPIRES_BEFORE_RETURN`: the planned return is later than visa expiry.
- `OVERDUE`: the planned return date has passed without a recorded actual departure.
- `DUE_TODAY`: planned return is today.
- `DUE_SOON`: planned return is within seven calendar days.
- `UPCOMING`: planned return is within fourteen calendar days.
- `ON_SCHEDULE`: no current departure warning exists.

Dates are date-only business values. Countdown calculations use calendar days and do not use browser-local time arithmetic.

## Source-of-truth rules

- Visa expiry comes from the latest approved visa application.
- Planned departure comes from the latest confirmed flight booking return date.
- No visa or flight dates are duplicated into a compliance table.
- A passed planned return date is a follow-up signal, not proof that the traveller overstayed.
- Actual departure and amendment tracking should be added as a later staff-confirmed workflow when operational users are ready to record those facts.

## UI behavior

The dashboard shows overdue, due-today, seven-day, visa-conflict, and missing-return-flight counts plus the highest-priority registrations. The registration details page shows the countdown and the underlying visa/flight dates in a responsive compliance card.

## Staff-confirmed closure workflow

The return date alone never completes a registration. Staff can use **Confirm return** for an on-schedule return or **Extend stay** to record an amended date, reason, and reference. The registration-list bulk action **Confirm returns** opens a per-registration date review; each date defaults to the scheduled or amended return date and can be edited before submission.

Completion writes `return_completion_status=COMPLETED` and `actual_return_date`. Extensions write `return_completion_status=EXTENDED` and preserve the amendment details on the registration. The registration remains operationally ready until the staff-confirmed completion action is performed.
