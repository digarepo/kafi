import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { Archive, Eye, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { formatPhone } from '../../../shared/format';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type Traveller } from '../../../lib/api.js';

/**
 * Traveller list page.
 *
 * Search is server-side and mirrored into the URL so the view is shareable
 * and survives reloads. Uses the shared `DataTable`/pagination primitives.
 */

const DEFAULT_PAGE_SIZE = 10;

export function TravellerListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state — single source of truth, mirrored to URL.
  const search = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const hasActiveFilters = Boolean(search);

  // Load travellers when search/pagination changes.
  useEffect(() => {
    let cancelled = false;
    async function loadTravellers() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.listTravellers(
          page,
          pageSize,
          search || undefined,
        );
        if (!cancelled) {
          setTravellers(result.data);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Travellers could not be loaded',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTravellers();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search]);

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

  const clearFilters = useCallback(() => {
    updateParams((next) => {
      next.delete('q');
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

  async function handleArchive(id: string) {
    if (!confirm('Archive this traveller?')) return;
    try {
      await api.archiveTraveller(id);
      const result = await api.listTravellers(
        page,
        pageSize,
        search || undefined,
      );
      setTravellers(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  const columns = useMemo<ColumnDef<Traveller>[]>(
    () => [
      textColumn<Traveller>({
        accessorKey: 'traveller_number',
        header: 'Number',
      }),
      {
        id: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => {
          const t = row.original;
          const name = [t.first_name, t.middle_name].filter(Boolean).join(' ');
          return <span>{name || '—'}</span>;
        },
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
        id: 'email',
        header: 'Email',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.email_address || '—'}
          </span>
        ),
      },
      actionsColumn<Traveller>({
        actions: [
          {
            label: 'View',
            icon: Eye,
            onClick: (t) => navigate(`/travellers/${t.id}`),
          },
          {
            label: 'Edit',
            icon: Pencil,
            onClick: (t) => navigate(`/travellers/${t.id}/edit`),
            disabled: () => !can('TRAVELLER_EDIT'),
          },
          {
            label: 'Archive',
            icon: Archive,
            onClick: (t) => void handleArchive(t.id),
            disabled: () => !can('TRAVELLER_DELETE'),
          },
        ],
      }),
    ],
    [can, navigate],
  );

  const pagination = {
    pageIndex: page - 1,
    pageSize,
    total,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Travellers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage master traveller records.
          </p>
        </div>
        {can('TRAVELLER_CREATE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => navigate('/travellers/new')}
          >
            Add traveller
          </Button>
        )}
        {can('TRAVELLER_CREATE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => navigate('/travellers/new')}
            aria-label="Add traveller"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Desktop: search + clear in one row */}
      {/* Mobile: search on row 1 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search travellers"
          />
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
        data={travellers}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
