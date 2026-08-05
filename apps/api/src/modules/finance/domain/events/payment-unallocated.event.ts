import {
  createDomainEvent,
  DomainEvent,
} from '../../../../shared/kernel/domain-event.js';

/**
 * Payload for the PaymentUnallocated event.
 *
 * @remarks
 * - `unallocated_amount` is always in ETB, consistent with `payments.amount`.
 */
export interface PaymentUnallocatedPayload {
  payment_id: string;
  payer_id: string;
  unallocated_amount: number;
  created_at: string;
}

/**
 * Published after a payment is created or allocated and a positive
 * unallocated ETB balance remains on the payment.
 */
export const PAYMENT_UNALLOCATED = 'finance.payment.unallocated';

/**
 * Creates a PaymentUnallocated domain event.
 *
 * @param payload - Event data payload.
 * @returns Fully formed domain event.
 */
export function createPaymentUnallocatedEvent(
  payload: PaymentUnallocatedPayload,
): DomainEvent & PaymentUnallocatedPayload {
  return createDomainEvent(PAYMENT_UNALLOCATED, payload);
}
