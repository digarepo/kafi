import { Badge, cn } from '@kafi/ui';

/**
 * Finance status codes mapped to badge variants.
 *
 * These cover invoice, payment, expense, refund, finance-exception, payer,
 * and payment-method status codes used across the finance module.
 */
const financeStatusVariants: Record<string, FinanceStatusVariant> = {
  // Invoice statuses
  DRAFT: 'stale',
  OPEN: 'info',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  VOID: 'destructive',
  CANCELLED: 'destructive',

  // Payment statuses
  PENDING: 'stale',
  COMPLETED: 'success',
  POSTED: 'success',
  RECEIVED: 'success',
  REVERSED: 'destructive',

  // Expense statuses
  CONFIRMED: 'success',

  // Refund statuses
  APPROVED: 'success',
  REJECTED: 'destructive',

  // Finance exception statuses
  ACTIVE: 'success',
  REVOKED: 'destructive',
  EXPIRED: 'stale',

  // Payer / payment-method statuses
  INACTIVE: 'stale',
};

export type FinanceStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'stale'
  | 'outline';

export function getFinanceStatusVariant(
  code: string | null | undefined,
): FinanceStatusVariant {
  if (!code) return 'outline';
  return financeStatusVariants[code] ?? 'outline';
}

interface FinanceStatusBadgeProps {
  status: { code: string; name: string } | null | undefined;
  className?: string;
}

/**
 * Renders a finance status as a colored Badge.
 *
 * Uses the status `name` as the label and `code` to pick the variant.
 */
export function FinanceStatusBadge({
  status,
  className,
}: FinanceStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn(className)}>
        Unknown
      </Badge>
    );
  }

  return (
    <Badge
      variant={getFinanceStatusVariant(status.code)}
      className={cn(className)}
      aria-label={`Status: ${status.name}`}
    >
      {status.name}
    </Badge>
  );
}
