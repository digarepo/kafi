import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { Archive, Eye, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { formatPhone } from '../../../shared/format';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type ContactPerson } from '../../../lib/api.js';

const DEFAULT_PAGE_SIZE = 10;

export function ContactListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const hasActiveFilters = Boolean(search);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listContactPersons(
          page,
          pageSize,
          search || undefined,
        );
        if (!cancelled) {
          setContacts(res.data);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Contact persons could not be loaded',
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
    if (!confirm('Archive this contact person?')) return;
    try {
      await api.archiveContactPerson(id);
      const res = await api.listContactPersons(
        page,
        pageSize,
        search || undefined,
      );
      setContacts(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  const columns = useMemo<ColumnDef<ContactPerson>[]>(
    () => [
      textColumn<ContactPerson>({
        accessorKey: 'first_name',
        header: 'First name',
      }),
      textColumn<ContactPerson>({
        accessorKey: 'last_name',
        header: 'Last name',
      }),
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
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => row.original.status?.name ?? '—',
      },
      actionsColumn<ContactPerson>({
        actions: [
          {
            label: 'View',
            icon: Eye,
            onClick: (c) => navigate(`/contact-persons/${c.id}`),
          },
          {
            label: 'Edit',
            icon: Pencil,
            onClick: (c) => navigate(`/contact-persons/${c.id}/edit`),
            disabled: () => !can('TRAVELLER_EDIT'),
          },
          {
            label: 'Archive',
            icon: Archive,
            onClick: (c) => void handleArchive(c.id),
            disabled: () => !can('TRAVELLER_DELETE'),
          },
        ],
      }),
    ],
    [can, navigate, page, pageSize, search],
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
          <h1 className="text-xl font-semibold tracking-tight">
            Contact persons
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reusable contact persons.
          </p>
        </div>
        {can('TRAVELLER_CREATE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => navigate('/contact-persons/new')}
          >
            + Add contact
          </Button>
        )}
        {can('TRAVELLER_CREATE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => navigate('/contact-persons/new')}
            aria-label="Add contact"
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search contact persons"
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
        data={contacts}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
