import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { WorkflowStatusBadge } from '../../../shared/operational-ui';
import { displayDate } from '../../operations/lib/date';
import { documentsApi, type VisaApplicationListItem } from '../lib/api';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';

export function VisaApplicationsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [visas, setVisas] = useState<VisaApplicationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedFilter = useDebouncedValue(globalFilter);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await documentsApi.listVisaApplications(
          pagination.pageIndex + 1,
          pagination.pageSize,
          debouncedFilter,
          { registration_id: registrationId },
        );
        if (!cancelled) {
          setVisas(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load visas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedFilter,
    pagination.pageIndex,
    pagination.pageSize,
    registrationId,
  ]);

  const contextRegistration = useMemo(() => {
    return (
      visas.find((v) => v.registration?.id === registrationId)?.registration ??
      null
    );
  }, [visas, registrationId]);

  async function reload() {
    const res = await documentsApi.listVisaApplications(
      pagination.pageIndex + 1,
      pagination.pageSize,
      debouncedFilter,
      { registration_id: registrationId },
    );
    setVisas(res.data);
    setPagination((current) => ({ ...current, total: res.total }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this visa application?')) return;
    try {
      await documentsApi.deleteVisaApplication(id);
      await reload();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const columns: ColumnDef<VisaApplicationListItem>[] = [
    textColumn<VisaApplicationListItem>({
      accessorKey: 'application_number',
      header: 'Application #',
    }),
    {
      id: 'registration',
      header: 'Registration',
      cell: ({ row }) => row.original.registration?.registration_number ?? '-',
    },
    {
      id: 'traveller',
      header: 'Traveller',
      cell: ({ row }) =>
        row.original.traveller
          ? `${row.original.traveller.first_name} ${row.original.traveller.last_name}`
          : '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <WorkflowStatusBadge status={row.original.status?.status_code} />
      ),
    },
    {
      id: 'submission_date',
      header: 'Submitted',
      cell: ({ row }) => displayDate(row.original.submission_date) ?? '-',
    },
    {
      id: 'result_date',
      header: 'Result',
      cell: ({ row }) => {
        const v = row.original;
        if (v.approval_date) return displayDate(v.approval_date) ?? '-';
        if (v.rejection_date) return displayDate(v.rejection_date) ?? '-';
        if (v.cancellation_date) return displayDate(v.cancellation_date) ?? '-';
        return '-';
      },
    },
    actionsColumn<VisaApplicationListItem>({
      actions: [
        {
          label: can('VISA_MANAGE') ? 'Process' : 'View',
          onClick: (v) => navigate(`/visa-applications/${v.id}`),
        },
        {
          label: 'Delete',
          onClick: (v) => void handleDelete(v.id),
          disabled: (v) =>
            !can('VISA_MANAGE') ||
            (v.status?.status_code !== 'SUBMITTED' &&
              v.status?.status_code !== 'CANCELLED'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visa applications</h1>
        <p className="text-muted-foreground">
          Track Saudi-visa applications per registration.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {registrationId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {contextRegistration
              ? `Showing visa applications for registration ${contextRegistration.registration_number}.`
              : 'Showing visa applications for the selected registration.'}
          </p>
          <div className="flex gap-2">
            <Link
              to={`/registrations/${registrationId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to registration
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All visas</h2>
        {can('VISA_MANAGE') && (
          <Button
            onClick={() =>
              navigate(
                registrationId
                  ? `/visa-applications/new?registration_id=${registrationId}`
                  : '/visa-applications/new',
              )
            }
          >
            + Add visa application
          </Button>
        )}
      </div>

      <DataTableToolbar
        filter={globalFilter}
        onFilterChange={(value) => {
          setGlobalFilter(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
      />
      <DataTable
        columns={columns}
        data={visas}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
