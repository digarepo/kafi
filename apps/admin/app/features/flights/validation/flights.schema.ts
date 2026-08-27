import { z } from 'zod';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');

export const flightBookingFormSchema = z
  .object({
    registration_id: z.string().min(1, 'Registration is required'),
    pnr: z.string().min(1, 'PNR / booking reference is required').max(50),
    departure_flight_number: z
      .string()
      .min(1, 'Departure flight number is required')
      .max(50),
    departure_date: dateSchema,
    return_flight_number: z.string().max(50),
    return_date: z.string(),
    supplier_cost: z.string(),
    notes: z.string(),
  })
  .superRefine((data, ctx) => {
    // Return flight consistency: both or neither
    const hasReturnNumber = !!data.return_flight_number.trim();
    const hasReturnDate = !!data.return_date.trim();
    if (hasReturnNumber !== hasReturnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Return flight number and return date must both be provided or both left empty',
        path: ['return_flight_number'],
      });
    }
    // Date order
    if (hasReturnDate && data.return_date < data.departure_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Return date must be on or after departure date',
        path: ['return_date'],
      });
    }
    // Supplier cost is required and must be positive
    const cost = Number(data.supplier_cost);
    if (!data.supplier_cost.trim() || isNaN(cost) || cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Supplier cost must be a positive amount in ETB',
        path: ['supplier_cost'],
      });
    }
  });

export const cancelFlightSchema = z.object({
  cancellation_reason: z.string().min(1, 'Cancellation reason is required'),
});
