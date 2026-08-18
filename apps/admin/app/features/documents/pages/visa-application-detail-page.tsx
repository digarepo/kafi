import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { WorkflowStatusBadge } from '../../../shared/operational-ui';
import { displayDate } from '../../operations/lib/date';
import {
  documentsApi,
  type VisaApplicationDetail,
  type VisaApplicationStatus,
} from '../lib/api';
import { RecordVisaResultDialog } from '../components/record-visa-result-dialog';
import type { VisaResultFormValues } from '../types/documents.types';

export function VisaApplicationDetailPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [visa, setVisa] = useState<VisaApplicationDetail | null>(null);
  const [statuses, setStatuses] = useState<VisaApplicationStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [recording, setRecording] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [v, s] = await Promise.all([
        documentsApi.getVisaApplication(id),
        documentsApi.listVisaStatuses(),
      ]);
      setVisa(v);
      setStatuses(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visa');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const canRecordResult = visa?.status?.status_code === 'SUBMITTED';

  async function handleRecordResult(values: VisaResultFormValues) {
    if (!id) return;
    const status = statuses.find((s) => s.status_code === values.outcome);
    if (!status) {
      toast.error('Invalid outcome selected');
      return;
    }
    setRecording(true);
    try {
      // If approving and a visa cost was entered, persist it first so the
      // backend's financial validation passes and the expense is created
      // with the correct amount.
      if (values.outcome === 'APPROVED' && values.visa_cost.trim()) {
        const costNum = Number(values.visa_cost);
        const existingCost = visa?.visa_cost ?? 0;
        if (!isNaN(costNum) && costNum > 0 && costNum !== existingCost) {
          await documentsApi.updateVisaApplication(id, {
            visa_cost: costNum,
          });
        }
      }
      await documentsApi.recordVisaResult(id, {
        visa_application_status_id: status.id,
        visa_number: values.visa_number.trim() || undefined,
        approval_date: values.approval_date.trim() || undefined,
        expiry_date: values.expiry_date.trim() || undefined,
        rejection_date: values.rejection_date.trim() || undefined,
        rejection_reason: values.rejection_reason.trim() || undefined,
        cancellation_date: values.cancellation_date.trim() || undefined,
        cancellation_reason: values.cancellation_reason.trim() || undefined,
      });
      toast.success('Visa result recorded');
      setShowResultDialog(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to record result',
      );
    } finally {
      setRecording(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm('Delete this visa application?')) return;
    try {
      await documentsApi.deleteVisaApplication(id);
      toast.success('Visa application deleted');
      navigate('/visa-applications');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!visa) return <p>Visa application not found</p>;

  const statusCode = visa.status?.status_code ?? '';
  const isApproved = statusCode === 'APPROVED';
  const canDelete = statusCode === 'SUBMITTED' || statusCode === 'CANCELLED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {visa.application_number}
        </h1>
        <p className="text-muted-foreground">
          {visa.registration ? (
            <>
              Registration{' '}
              <Link
                to={`/registrations/${visa.registration.id}`}
                className="font-medium text-primary hover:underline"
              >
                {visa.registration.registration_number}
              </Link>{' '}
              for{' '}
            </>
          ) : (
            'No registration for '
          )}
          {visa.traveller
            ? `${visa.traveller.first_name} ${visa.traveller.last_name}`
            : 'unknown traveller'}
        </p>
      </div>

      <div className="space-y-2 rounded border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <strong>Status:</strong> <WorkflowStatusBadge status={statusCode} />
        </div>
        <p>
          <strong>Submission:</strong> {displayDate(visa.submission_date)}
        </p>
        {isApproved && (
          <>
            <p>
              <strong>Approval:</strong> {displayDate(visa.approval_date)}
            </p>
            <p>
              <strong>Expiry:</strong> {displayDate(visa.expiry_date)}
            </p>
            <p>
              <strong>Visa number:</strong> {visa.visa_number ?? '—'}
            </p>
            <p>
              <strong>Visa cost:</strong>{' '}
              {visa.visa_cost != null
                ? `${Number(visa.visa_cost).toLocaleString()} ETB`
                : '—'}
            </p>
          </>
        )}
        {statusCode === 'REJECTED' && (
          <>
            <p>
              <strong>Rejection date:</strong>{' '}
              {displayDate(visa.rejection_date)}
            </p>
            <p>
              <strong>Rejection reason:</strong> {visa.rejection_reason ?? '—'}
            </p>
          </>
        )}
        {statusCode === 'CANCELLED' && (
          <>
            <p>
              <strong>Cancellation date:</strong>{' '}
              {displayDate(visa.cancellation_date)}
            </p>
            <p>
              <strong>Cancellation reason:</strong>{' '}
              {visa.cancellation_reason ?? '—'}
            </p>
          </>
        )}
        {visa.notes && (
          <p>
            <strong>Notes:</strong> {visa.notes}
          </p>
        )}
      </div>

      {isApproved && visa.registration && (
        <div className="flex flex-col gap-3 rounded-md border border-success/20 bg-success/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-success">
            Visa approved. Record the purchased flight ticket to proceed.
          </p>
          {can('FLIGHT_MANAGE') ? (
            <Button
              onClick={() =>
                navigate(
                  `/flight-bookings/new?registration_id=${visa.registration!.id}`,
                )
              }
            >
              Record flight booking
            </Button>
          ) : can('FLIGHT_VIEW') ? (
            <Link
              to={`/flight-bookings?registration_id=${visa.registration.id}`}
              className="font-medium text-success underline hover:no-underline"
            >
              View flight bookings
            </Link>
          ) : null}
        </div>
      )}

      {can('VISA_MANAGE') && canRecordResult && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Record visa result
          </h2>
          <p className="text-sm text-muted-foreground">
            Record the external visa decision (approved, rejected, or
            cancelled).
          </p>
          <Button onClick={() => setShowResultDialog(true)}>
            Record visa result
          </Button>
        </div>
      )}

      {can('VISA_MANAGE') && canDelete && (
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </div>
      )}

      <RecordVisaResultDialog
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
        onSubmit={handleRecordResult}
        loading={recording}
        currentVisaCost={visa?.visa_cost ?? null}
      />
    </div>
  );
}
