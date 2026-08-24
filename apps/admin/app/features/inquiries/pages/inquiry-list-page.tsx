import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, RotateCcw, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@kafi/ui';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { formatPhone } from '../../../shared/format';
import { displayDate } from '../../operations/lib/date';
import {
  api,
  type Inquiry,
  type InquiryStatus,
  type InquirySummary,
  type InquiryType,
} from '../../../lib/api.js';

/**
 * Inquiry inbox list page.
 *
 * Server-side filters (status, type, search) are mirrored into the URL so the
 * view is shareable and survives reloads. A summary strip surfaces the current
 * backlog by status.
 */

const DEFAULT_PAGE_SIZE = 10;

const TYPE_LABELS: Record<InquiryType, string> = {
  BOOKING: 'Booking',
  CALLBACK: 'Callback',
  CONTACT: 'Contact',
  ENQUIRY: 'Enquiry',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  RESOLVED: 'Resolved',
};

const STATUS_VARIANT: Record<InquiryStatus, 'default' | 'secondary' | 'outline'> =
  {
    NEW: 'default',
    CONTACTED: 'secondary',
    RESOLVED: 'outline',
  };

export function InquiryListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const status = (searchParams.get('status') ?? '') as InquiryStatus | '';
  const type = (searchParams.get('type') ?? '') as InquiryType | '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [summary, setSummary] = useState<InquirySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const hasActiveFilters = Boolean(search || status || type);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [list, sum] = await Promise.all([
          api.listInquiries({
            page,
            page_size: pageSize,
            search: search || undefined,
            status: status || undefined,
            type: type || undefined,
          }),
          api.getInquirySummary(),
        ]);
        if (!cancelled) {
          setInquiries(list.data);
          setTotal(list.total);
          setSummary(sum);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Inquiries could not be loaded',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, status, type]);

  const updateParams = useCallback(
    (mutator: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutator(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value) next.set('q', value);
        else next.delete('q');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const setStatusFilter = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value) next.set('status', value);
        else next.delete('status');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const setTypeFilter = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value) next.set('type', value);
        else next.delete('type');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    updateParams((next) => {
      next.delete('q');
      next.delete('status');
      next.delete('type');
      next.delete('page');
    });
  }, [updateParams]);

  const setPagination = useCallback(
    (next: { pageIndex: number; pageSize: number; total: number }) => {
      updateParams((params) => {
        const nextPage = next.pageIndex + 1;
        if (nextPage > 1) params.set('page', String(nextPage));
        else params.delete('page');
        if (next.pageSize !== DEFAULT_PAGE_SIZE) {
          params.set('size', String(next.pageSize));
        } else {
          params.delete('size');
        }
      });
    },
    [updateParams],
  );

  const columns = useMemo<ColumnDef<Inquiry>[]>(
    () => [
      textColumn<Inquiry>({
        accessorKey: 'inquiry_number',
        header: 'Number',
      }),
      {
        id: 'type',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline">{TYPE_LABELS[row.original.inquiry_type]}</Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.inquiry_status]}>
            {STATUS_LABELS[row.original.inquiry_status]}
          </Badge>
        ),
      },
      {
        id: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <span>{row.original.full_name || '—'}</span>
        ),
      },
      {
        id: 'phone',
        header: 'Phone',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatPhone(row.original.phone_number)}
          </span>
        ),
      },
      {
        id: 'received',
        header: 'Received',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {displayDate(row.original.created_at)}
          </span>
        ),
      },
      actionsColumn<Inquiry>({
        actions: [
          {
            label: 'View',
            icon: Eye,
            onClick: (inquiry) => navigate(`/inquiries/${inquiry.id}`),
          },
        ],
      }),
    ],
    [navigate],
  );

  const pagination = {
    pageIndex: page - 1,
    pageSize,
    total,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inquiry inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public callback, contact, booking, and enquiry submissions.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="New" value={summary.new} variant="default" />
          <SummaryCard
            label="Contacted"
            value={summary.contacted}
            variant="secondary"
          />
          <SummaryCard
            label="Resolved"
            value={summary.resolved}
            variant="outline"
          />
          <SummaryCard label="Total" value={summary.total} variant="outline" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search number, name, phone, email…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search inquiries"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-40">
            <Select
              value={status}
              onValueChange={(v) => setStatusFilter(v ?? '')}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {status ? STATUS_LABELS[status] : 'All statuses'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-40">
            <Select
              value={type}
              onValueChange={(v) => setTypeFilter(v ?? '')}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {type ? TYPE_LABELS[type] : 'All types'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="BOOKING">Booking</SelectItem>
                <SelectItem value="CALLBACK">Callback</SelectItem>
                <SelectItem value="CONTACT">Contact</SelectItem>
                <SelectItem value="ENQUIRY">Enquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 self-start text-muted-foreground lg:self-center"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={inquiries}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  variant: 'default' | 'secondary' | 'outline';
}

function SummaryCard({ label, value, variant }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Badge variant={variant}>{value}</Badge>
      </div>
    </div>
  );
}
