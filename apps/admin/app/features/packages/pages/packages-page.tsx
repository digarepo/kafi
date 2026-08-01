import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import {
  actionsColumn,
  statusColumn,
  textColumn,
} from '../../../shared/data-table/columns';
import {
  api,
  type Currency,
  type PackageCategory,
  type PackageTemplate,
  type PackageVersion,
  type PilgrimageType,
  type Season,
  type CreatePackageTemplateInput,
  type UpdatePackageTemplateInput,
  type CreatePackageVersionInput,
} from '../../../lib/api.js';
import { PackageTemplateDialog } from '../components/package-template-dialog';
import { PackageVersionDialog } from '../components/package-version-dialog';
import { PackageDetailPanel } from '../components/package-detail-panel';
import type {
  PackageTemplateFormOutput,
  PackageVersionFormOutput,
} from '../types/packages.types';

type Tab = 'templates' | 'versions';

export function PackagesPage() {
  const { can } = usePermissions();
  const [tab, setTab] = useState<Tab>('templates');

  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [pilgrimageTypes, setPilgrimageTypes] = useState<PilgrimageType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [versions, setVersions] = useState<PackageVersion[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<PackageTemplate | null>(null);
  const [createVersionOpen, setCreateVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<PackageVersion | null>(
    null,
  );
  const [viewingTemplate, setViewingTemplate] =
    useState<PackageTemplate | null>(null);
  const [viewingVersion, setViewingVersion] = useState<PackageVersion | null>(
    null,
  );

  async function refreshAll() {
    setLoading(true);
    try {
      const [cat, pt, cur, sea, tpl, ver] = await Promise.all([
        api.listPackageCategories(),
        api.listPilgrimageTypes(),
        api.listCurrencies(),
        api.listSeasons(),
        api.listPackageTemplates(1, 100),
        api.listPackageVersions(1, 100),
      ]);
      setCategories(cat);
      setPilgrimageTypes(pt);
      setCurrencies(cur);
      setSeasons(sea);
      setTemplates(tpl.data);
      setVersions(ver.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  async function handleCreateTemplate(values: PackageTemplateFormOutput) {
    setError(null);
    setSuccess(null);
    try {
      await api.createPackageTemplate(values as CreatePackageTemplateInput);
      setSuccess('Template created');
      setCreateTemplateOpen(false);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  }

  async function handleUpdateTemplate(values: PackageTemplateFormOutput) {
    if (!editingTemplate) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updatePackageTemplate(
        editingTemplate.id,
        values as UpdatePackageTemplateInput,
      );
      setSuccess('Template updated');
      setEditingTemplate(null);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  }

  async function handleArchiveTemplate(id: string) {
    if (!confirm('Archive this template?')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.archivePackageTemplate(id);
      setSuccess('Template archived');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleCreateVersion(values: PackageVersionFormOutput) {
    setError(null);
    setSuccess(null);
    try {
      await api.createPackageVersion(values as CreatePackageVersionInput);
      setSuccess('Version created');
      setCreateVersionOpen(false);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version');
    }
  }

  async function handleUpdateVersion(values: PackageVersionFormOutput) {
    if (!editingVersion) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updatePackageVersion(editingVersion.id, values);
      setSuccess('Version updated');
      setEditingVersion(null);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update version');
    }
  }

  async function handlePublishVersion(id: string) {
    setError(null);
    setSuccess(null);
    try {
      await api.publishPackageVersion(id);
      setSuccess('Version published');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    }
  }

  async function handleArchiveVersion(id: string) {
    if (!confirm('Archive this version?')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.archivePackageVersion(id);
      setSuccess('Version archived');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleEditVersion(v: PackageVersion) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const full = await api.getPackageVersion(v.id);
      setEditingVersion(full);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load version details',
      );
    } finally {
      setLoading(false);
    }
  }

  const templateColumns: ColumnDef<PackageTemplate>[] = [
    textColumn<PackageTemplate>({
      accessorKey: 'package_template_code',
      header: 'Code',
    }),
    textColumn<PackageTemplate>({ accessorKey: 'name', header: 'Name' }),
    {
      id: 'category',
      header: 'Category',
      enableSorting: false,
      cell: ({ row }) => row.original.package_category?.name ?? '-',
    },
    {
      id: 'type',
      header: 'Type',
      enableSorting: false,
      cell: ({ row }) => row.original.pilgrimage_type?.name ?? '-',
    },
    textColumn<PackageTemplate>({
      accessorKey: 'default_duration_days',
      header: 'Duration',
    }),
    actionsColumn<PackageTemplate>({
      actions: [
        {
          label: 'View',
          onClick: (t) => {
            setViewingTemplate(t);
            setViewingVersion(null);
          },
          disabled: () => !can('PACKAGE_VIEW'),
        },
        {
          label: 'Edit',
          onClick: (t) => setEditingTemplate(t),
          disabled: () => !can('PACKAGE_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (t) => handleArchiveTemplate(t.id),
          disabled: () => !can('PACKAGE_DELETE'),
        },
      ],
    }),
  ];

  const versionColumns: ColumnDef<PackageVersion>[] = [
    textColumn<PackageVersion>({
      accessorKey: 'package_version_code',
      header: 'Code',
    }),
    textColumn<PackageVersion>({ accessorKey: 'version_name', header: 'Name' }),
    {
      id: 'template',
      header: 'Template',
      enableSorting: false,
      cell: ({ row }) => row.original.package_template?.name ?? '-',
    },
    textColumn<PackageVersion>({ accessorKey: 'slug', header: 'Slug' }),
    statusColumn<PackageVersion>({
      accessorKey: 'status',
      header: 'Status',
    }),
    {
      id: 'price',
      header: 'Price',
      enableSorting: false,
      cell: ({ row }) => row.original.base_price,
    },
    actionsColumn<PackageVersion>({
      actions: [
        {
          label: 'View',
          onClick: (v) => {
            setViewingVersion(v);
            setViewingTemplate(null);
          },
          disabled: () => !can('PACKAGE_VIEW'),
        },
        {
          label: 'Edit',
          onClick: (v) => void handleEditVersion(v),
          disabled: () => !can('PACKAGE_EDIT'),
        },
        {
          label: 'Publish',
          onClick: (v) => handlePublishVersion(v.id),
          disabled: (v) => !can('PACKAGE_EDIT') || v.status === 'PUBLISHED',
        },
        {
          label: 'Archive',
          onClick: (v) => handleArchiveVersion(v.id),
          disabled: () => !can('PACKAGE_DELETE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Packages</h1>
        <p className="text-muted-foreground">
          Manage package templates and sellable versions.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-green-800">
          {success}
        </div>
      )}

      <PackageTemplateDialog
        mode="create"
        categories={categories}
        pilgrimageTypes={pilgrimageTypes}
        open={createTemplateOpen}
        onOpenChange={(open) => {
          setCreateTemplateOpen(open);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleCreateTemplate}
        error={createTemplateOpen ? error : null}
        success={createTemplateOpen ? success : null}
      />

      <PackageTemplateDialog
        mode="edit"
        template={editingTemplate}
        categories={categories}
        pilgrimageTypes={pilgrimageTypes}
        open={editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleUpdateTemplate}
        error={editingTemplate !== null ? error : null}
        success={editingTemplate !== null ? success : null}
      />

      <PackageVersionDialog
        mode="create"
        templates={templates}
        currencies={currencies}
        seasons={seasons}
        open={createVersionOpen}
        onOpenChange={(open) => {
          setCreateVersionOpen(open);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleCreateVersion}
        error={createVersionOpen ? error : null}
        success={createVersionOpen ? success : null}
      />

      <PackageVersionDialog
        mode="edit"
        version={editingVersion}
        templates={templates}
        currencies={currencies}
        seasons={seasons}
        open={editingVersion !== null}
        onOpenChange={(open) => {
          if (!open) setEditingVersion(null);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleUpdateVersion}
        error={editingVersion !== null ? error : null}
        success={editingVersion !== null ? success : null}
      />

      <PackageDetailPanel
        template={viewingTemplate}
        version={viewingVersion}
        onClose={() => {
          setViewingTemplate(null);
          setViewingVersion(null);
        }}
      />

      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={tab === 'templates' ? 'default' : 'outline'}
          onClick={() => setTab('templates')}
        >
          Templates
        </Button>
        <Button
          variant={tab === 'versions' ? 'default' : 'outline'}
          onClick={() => setTab('versions')}
        >
          Versions
        </Button>
      </div>

      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Templates</h2>
            {can('PACKAGE_CREATE') && (
              <Button onClick={() => setCreateTemplateOpen(true)}>
                + Add template
              </Button>
            )}
          </div>

          <DataTableToolbar
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
          />

          <DataTable
            columns={templateColumns}
            data={templates}
            loading={loading}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </div>
      )}

      {tab === 'versions' && (
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Versions</h2>
            {can('PACKAGE_CREATE') && (
              <Button onClick={() => setCreateVersionOpen(true)}>
                + Add version
              </Button>
            )}
          </div>

          <DataTableToolbar
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
          />

          <DataTable
            columns={versionColumns}
            data={versions}
            loading={loading}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </div>
      )}
    </div>
  );
}
