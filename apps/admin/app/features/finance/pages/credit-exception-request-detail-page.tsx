import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@kafi/ui';
import { toast } from 'sonner';

import { usePermissions } from '../../../core/permissions';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import { FinanceStatusBadge } from '../../../shared/finance-status';
import { formatMoney } from '../../../shared/format';
import { displayDate } from '../../operations/lib/date';
import {
  api,
  type CreditExceptionRequest,
  type CreditExceptionRequestListItem,
} from '../../../lib/api.js';

interface CreditExceptionRequestDetailPageProps {
  id: string;
}

export function CreditExceptionRequestDetailPage({
  id,
}: CreditExceptionRequestDetailPageProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [request, setRequest] = useState<CreditExceptionRequest | null>(null);
  const [listItem, setListItem] =
    useState<CreditExceptionRequestListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  async function reload() {
    const [detail, list] = await Promise.all([
      api.getCreditExceptionRequest(id),
      api
        .listCreditExceptionRequests(1, 100)
        .then((res) => res.data.find((r) => r.id === id)),
    ]);
    setRequest(detail);
    setListItem(list ?? null);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await reload();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load request',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleApprove() {
    if (!request) return;
    if (
      !(await confirm({
        title: 'Approve credit exception request?',
        description:
          'An ACTIVE finance exception will be created for this registration, satisfying the payment readiness gate.',
        confirmLabel: 'Approve',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.approveCreditExceptionRequest(request.id);
      toast.success('Credit exception request approved.');
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to approve request';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!request || !rejectionReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.rejectCreditExceptionRequest(request.id, {
        rejection_reason: rejectionReason,
      });
      toast.success('Credit exception request rejected.');
      setRejectOpen(false);
      setRejectionReason('');
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reject request';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    if (!request) return;
    if (
      !(await confirm({
        title: 'Archive credit exception request?',
        description:
          'The request will be removed from active records and can be restored later.',
        confirmLabel: 'Archive',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.archiveCreditExceptionRequest(request.id);
      toast.success('Request archived.');
      navigate('/credit-exception-requests');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive request';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!request)
    return <p className="text-destructive">{error ?? 'Request not found'}</p>;

  const status = listItem?.status ?? null;
  const isPending = status?.code === 'PENDING';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {request.request_number}
          </h1>
          <FinanceStatusBadge status={status} />
        </div>
        <div className="flex gap-2">
          {can('FINANCE_CREDIT_AUTHORIZE') && isPending && (
            <>
              <Button
                disabled={actionLoading}
                onClick={() => void handleApprove()}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
            </>
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
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Registration</p>
            <Link
              to={`/registrations/${request.registration_id}`}
              className="font-medium text-primary hover:underline"
            >
              View registration
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Requested amount
            </p>
            <p className="font-medium">
              {formatMoney(request.requested_amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Requested due date
            </p>
            <p className="font-medium">
              {request.requested_due_date
                ? displayDate(request.requested_due_date)
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Requested at</p>
            <p className="font-medium">{displayDate(request.created_at)}</p>
          </div>
          {request.reviewed_at && (
            <div>
              <p className="text-sm text-muted-foreground">Reviewed at</p>
              <p className="font-medium">
                {displayDate(request.reviewed_at)}
              </p>
            </div>
          )}
          {request.finance_exception_id && (
            <div>
              <p className="text-sm text-muted-foreground">
                Approved exception
              </p>
              <Link
                to={`/finance-exceptions/${request.finance_exception_id}`}
                className="font-medium text-primary hover:underline"
              >
                View exception
              </Link>
            </div>
          )}
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="font-medium">{request.reason}</p>
          </div>
          {request.rejection_reason && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">
                Rejection reason
              </p>
              <p className="font-medium text-destructive">
                {request.rejection_reason}
              </p>
            </div>
          )}
          {request.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{request.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject credit exception request</DialogTitle>
            <DialogDescription>
              The registration will remain payment-blocked. Provide a reason
              for the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection_reason" className="text-sm font-medium">
              Rejection reason
            </Label>
            <Textarea
              id="rejection_reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-20"
              placeholder="Explain why this request is being rejected…"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading || !rejectionReason.trim()}
              onClick={() => void handleReject()}
            >
              {actionLoading ? 'Rejecting…' : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
