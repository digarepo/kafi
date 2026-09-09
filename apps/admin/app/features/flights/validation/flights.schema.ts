import { z } from "zod";

const dateRangeSchema = z
  .object({
    from: z.date().optional(),
    to: z.date().optional(),
  })
  .refine((data) => data.from instanceof Date, {
    message: "Departure date is required",
    path: ["from"],
  });

export const flightBookingFormSchema = z
  .object({
    registration_id: z.string().min(1, "Registration is required"),
    pnr: z.string().trim().min(1, "PNR / booking reference is required").max(50),
    departure_airline_id: z.string().min(1, "Departure airline is required"),
    departure_flight_number: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^\d{1,4}[A-Z]?$/, "Use 1–4 digits with an optional suffix letter"),
    return_airline_id: z.string(),
    return_flight_number: z.string().trim().toUpperCase(),
    travelRange: dateRangeSchema,
    ticket_cost: z.string(),
    notes: z.string(),
  })
  .superRefine((data, ctx) => {
    // Return flight consistency: airline, number, and date are all required together.
    const hasReturnAirline = !!data.return_airline_id;
    const hasReturnNumber = !!data.return_flight_number.trim();
    const hasReturnDate = !!data.travelRange?.to;
    if (hasReturnAirline || hasReturnNumber || hasReturnDate) {
      if (!hasReturnAirline || !hasReturnNumber || !hasReturnDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return airline, flight number, and date must be provided together",
          path: ["return_flight_number"],
        });
      }
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
        message: "Return date must be on or after departure date",
        path: ["travelRange"],
      });
    }
    // Ticket cost is required and must be positive
    const cost = Number(data.ticket_cost);
    if (!data.ticket_cost.trim() || isNaN(cost) || cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ticket cost must be a positive amount in ETB",
        path: ["ticket_cost"],
      });
    }
  });

export const cancelFlightSchema = z.object({
  cancellation_reason: z.string().min(1, "Cancellation reason is required"),
});
