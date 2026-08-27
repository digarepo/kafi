import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kafi/ui';
import { toast } from 'sonner';

import { usePermissions } from '../../../core/permissions';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import { FinanceStatusBadge } from '../../../shared/finance-status';
import { formatMoney } from '../../../shared/format';
import { displayDate } from '../../operations/lib/date';
import {
  api,
  type Refund,
  type RefundListItem,
} from '../../../lib/api.js';

interface RefundDetailPageProps {
  id: string;
}

export function RefundDetailPage({ id }: RefundDetailPageProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [refund, setRefund] = useState<Refund | null>(null);
  const [listItem, setListItem] = useState<RefundListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function reload() {
    const [detail, list] = await Promise.all([
      api.getRefund(id),
      api.listRefunds(1, 100).then((res) => res.data.find((r) => r.id === id)),
    ]);
    setRefund(detail);
    setListItem(list ?? null);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load refund');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleComplete() {
    if (!refund) return;
    if (
      !(await confirm({
        title: 'Complete refund?',
        description:
          'Mark this refund as completed. This confirms the money has been returned to the customer.',
        confirmLabel: 'Complete',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.completeRefund(refund.id);
      toast.success('Refund marked as completed.');
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to complete refund';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!refund) return;
    if (
      !(await confirm({
        title: 'Cancel refund?',
        description:
          'Cancel this refund. The refundable balance will be restored.',
        confirmLabel: 'Cancel refund',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.cancelRefund(refund.id);
      toast.success('Refund cancelled.');
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to cancel refund';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    if (!refund) return;
    if (
      !(await confirm({
        title: 'Archive refund?',
        description:
          'The refund will be removed from active records and can be restored later.',
        confirmLabel: 'Archive',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.archiveRefund(refund.id);
      toast.success('Refund archived.');
      navigate('/refunds');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive refund';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!refund) return <p className="text-destructive">{error ?? 'Refund not found'}</p>;

  const status = listItem?.status ?? null;
  const canComplete = status?.code === 'APPROVED';
  const canCancel = status?.code === 'APPROVED' || status?.code === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {refund.refund_number}
          </h1>
          <FinanceStatusBadge status={status} />
        </div>
        <div className="flex gap-2">
          {can('FINANCE_REFUND_APPROVE') && canComplete && (
            <Button
              disabled={actionLoading}
              onClick={() => void handleComplete()}
            >
              Complete
            </Button>
          )}
          {can('FINANCE_REFUND_APPROVE') && canCancel && (
            <Button
              variant="outline"
              disabled={actionLoading}
              onClick={() => void handleCancel()}
            >
              Cancel refund
            </Button>
          )}
          {can('FINANCE_DELETE') && (
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => void handleArchive()}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Refund details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Payment</p>
            <Link
              to={`/payments/${refund.payment_id}`}
              className="font-medium text-primary hover:underline"
            >
              View payment
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-medium">{formatMoney(refund.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Refund date</p>
            <p className="font-medium">{displayDate(refund.refund_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved at</p>
            <p className="font-medium">{displayDate(refund.approved_at)}</p>
          </div>
          {refund.registration_id && (
            <div>
              <p className="text-sm text-muted-foreground">Registration</p>
              <Link
                to={`/registrations/${refund.registration_id}`}
                className="font-medium text-primary hover:underline"
              >
                View registration
              </Link>
            </div>
          )}
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="font-medium">{refund.reason}</p>
          </div>
          {refund.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{refund.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
