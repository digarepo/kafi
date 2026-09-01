import { z } from 'zod';

const dateRangeSchema = z
  .object({
    from: z.date().optional(),
    to: z.date().optional(),
  })
  .refine((data) => data.from instanceof Date, {
    message: 'Departure date is required',
    path: ['from'],
  });

export const flightBookingFormSchema = z
  .object({
    registration_id: z.string().min(1, 'Registration is required'),
    pnr: z.string().min(1, 'PNR / booking reference is required').max(50),
    departure_flight_number: z
      .string()
      .min(1, 'Departure flight number is required')
      .max(50),
    return_flight_number: z.string().max(50),
    travelRange: dateRangeSchema,
    ticket_cost: z.string(),
    notes: z.string(),
  })
  .superRefine((data, ctx) => {
    // Return flight consistency: both or neither
    const hasReturnNumber = !!data.return_flight_number.trim();
    const hasReturnDate = !!data.travelRange?.to;
    if (hasReturnNumber !== hasReturnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Return flight number and return date must both be provided or both left empty',
        path: ['return_flight_number'],
      });
    }
    // Date order
    if (
      hasReturnDate &&
      data.travelRange?.to &&
      data.travelRange?.from &&
      data.travelRange.to < data.travelRange.from
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Return date must be on or after departure date',
        path: ['travelRange'],
      });
    }
    // Ticket cost is required and must be positive
    const cost = Number(data.ticket_cost);
    if (!data.ticket_cost.trim() || isNaN(cost) || cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ticket cost must be a positive amount in ETB',
        path: ['ticket_cost'],
      });
    }
  });

export const cancelFlightSchema = z.object({
  cancellation_reason: z.string().min(1, 'Cancellation reason is required'),
});
