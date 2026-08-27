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
  type FinanceException,
  type FinanceExceptionListItem,
} from '../../../lib/api.js';

interface FinanceExceptionDetailPageProps {
  id: string;
}

export function FinanceExceptionDetailPage({
  id,
}: FinanceExceptionDetailPageProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [exception, setException] = useState<FinanceException | null>(null);
  const [listItem, setListItem] = useState<FinanceExceptionListItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function reload() {
    const [detail, list] = await Promise.all([
      api.getFinanceException(id),
      api.listFinanceExceptions(1, 1, undefined, undefined).then((res) =>
        res.data.find((e) => e.id === id),
      ),
    ]);
    setException(detail);
    setListItem(list ?? null);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await reload();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load exception',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleRevoke() {
    if (!exception) return;
    if (
      !(await confirm({
        title: 'Revoke credit exception?',
        description:
          'The registration will no longer be able to proceed on credit. The outstanding balance remains unchanged.',
        confirmLabel: 'Revoke',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.revokeFinanceException(exception.id);
      toast.success('Credit exception revoked.');
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to revoke exception';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    if (!exception) return;
    if (
      !(await confirm({
        title: 'Archive credit exception?',
        description:
          'The exception will be removed from active records and can be restored later.',
        confirmLabel: 'Archive',
      }))
    )
      return;
    setActionLoading(true);
    setError(null);
    try {
      await api.archiveFinanceException(exception.id);
      toast.success('Credit exception archived.');
      navigate('/finance-exceptions');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive exception';
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!exception)
    return (
      <p className="text-destructive">{error ?? 'Exception not found'}</p>
    );

  const status = listItem?.status ?? null;
  const isActive = status?.code === 'ACTIVE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {exception.exception_number}
          </h1>
          <FinanceStatusBadge status={status} />
        </div>
        <div className="flex gap-2">
          {can('FINANCE_CREDIT_AUTHORIZE') && isActive && (
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => void handleRevoke()}
            >
              Revoke
            </Button>
          )}
          {can('FINANCE_DELETE') && (
            <Button
              variant="outline"
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
          <CardTitle>Exception details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Registration</p>
            <Link
              to={`/registrations/${exception.registration_id}`}
              className="font-medium text-primary hover:underline"
            >
              View registration
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Authorized amount
            </p>
            <p className="font-medium">
              {formatMoney(exception.authorized_amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved at</p>
            <p className="font-medium">
              {displayDate(exception.approved_at)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due date</p>
            <p className="font-medium">
              {exception.due_date ? displayDate(exception.due_date) : '-'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Reason</p>
            <p className="font-medium">{exception.reason}</p>
          </div>
          {exception.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-medium">{exception.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
