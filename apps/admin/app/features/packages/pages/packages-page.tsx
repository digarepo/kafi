import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { useRenderProfile } from '../../../dev/render-profile';
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
  useRenderProfile('PackagesPage');
  const { can } = usePermissions();
  const [tab, setTab] = useState<Tab>('templates');

  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [pilgrimageTypes, setPilgrimageTypes] = useState<PilgrimageType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [versions, setVersions] = useState<PackageVersion[]>([]);

  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [templatePagination, setTemplatePagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });
  const [versionPagination, setVersionPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });

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

  const loadPackages = useCallback(
    async (scope: 'all' | 'templates' | 'versions' = 'all') => {
      setLoading(true);
      try {
        const referencesPromise =
          scope === 'all'
            ? Promise.all([
                api.listPackageCategories(),
                api.listPilgrimageTypes(),
                api.listCurrencies(),
                api.listSeasons(),
              ])
            : Promise.resolve(null);
        const templatesPromise =
          scope === 'all' || scope === 'templates'
            ? api.listPackageTemplates(
                templatePagination.pageIndex + 1,
                templatePagination.pageSize,
                tab === 'templates' ? globalFilter || undefined : undefined,
              )
            : Promise.resolve(null);
        const versionsPromise =
          scope === 'all' || scope === 'versions'
            ? api.listPackageVersions(
                versionPagination.pageIndex + 1,
                versionPagination.pageSize,
                undefined,
                tab === 'versions' ? globalFilter || undefined : undefined,
              )
            : Promise.resolve(null);
        const [references, tpl, ver] = await Promise.all([
          referencesPromise,
          templatesPromise,
          versionsPromise,
        ]);

        if (references) {
          const [cat, pt, cur, sea] = references;
          setCategories(cat);
          setPilgrimageTypes(pt);
          setCurrencies(cur);
          setSeasons(sea);
        }
        if (tpl) {
          setTemplates(tpl.data);
          setTemplatePagination((current) => ({
            ...current,
            total: tpl.total,
          }));
        }
        if (ver) {
          setVersions(ver.data);
          setVersionPagination((current) => ({
            ...current,
            total: ver.total,
          }));
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load packages',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      globalFilter,
      tab,
      templatePagination.pageIndex,
      templatePagination.pageSize,
      versionPagination.pageIndex,
      versionPagination.pageSize,
    ],
  );

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  async function handleCreateTemplate(values: PackageTemplateFormOutput) {
    try {
      await api.createPackageTemplate(values as CreatePackageTemplateInput);
      toast.success('Template created');
      setCreateTemplateOpen(false);
      await loadPackages('templates');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create template',
      );
    }
  }

  async function handleUpdateTemplate(values: PackageTemplateFormOutput) {
    if (!editingTemplate) return;
    try {
      await api.updatePackageTemplate(
        editingTemplate.id,
        values as UpdatePackageTemplateInput,
      );
      toast.success('Template updated');
      setEditingTemplate(null);
      await loadPackages('templates');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update template',
      );
    }
  }

  const handleArchiveTemplate = useCallback(
    async (id: string) => {
      if (!confirm('Archive this template?')) return;
      try {
        await api.archivePackageTemplate(id);
        toast.success('Template archived');
        await loadPackages('templates');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Archive failed');
      }
    },
    [loadPackages],
  );

  async function handleCreateVersion(values: PackageVersionFormOutput) {
    try {
      await api.createPackageVersion(values as CreatePackageVersionInput);
      toast.success('Version created');
      setCreateVersionOpen(false);
      await loadPackages('versions');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create version',
      );
    }
  }

  async function handleUpdateVersion(values: PackageVersionFormOutput) {
    if (!editingVersion) return;
    try {
      await api.updatePackageVersion(editingVersion.id, values);
      toast.success('Version updated');
      setEditingVersion(null);
      await loadPackages('versions');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update version',
      );
    }
  }

  const handlePublishVersion = useCallback(
    async (id: string) => {
      try {
        await api.publishPackageVersion(id);
        toast.success('Version published');
        await loadPackages('versions');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Publish failed');
      }
    },
    [loadPackages],
  );

  const handleCloseVersion = useCallback(
    async (id: string) => {
      if (
        !confirm(
          'Close this version early? It will stop accepting registrations.',
        )
      )
        return;
      try {
        await api.closePackageVersion(id);
        toast.success('Version closed');
        await loadPackages('versions');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Close failed');
      }
    },
    [loadPackages],
  );

  const handleCancelVersion = useCallback(
    async (id: string) => {
      if (!confirm('Cancel this package version?')) return;
      try {
        await api.cancelPackageVersion(id);
        toast.success('Version cancelled');
        await loadPackages('versions');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Cancellation failed');
      }
    },
    [loadPackages],
  );

  const handleEditVersion = useCallback(async (v: PackageVersion) => {
    setLoading(true);
    try {
      const full = await api.getPackageVersion(v.id);
      setEditingVersion(full);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load version details',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const templateColumns = useMemo<ColumnDef<PackageTemplate>[]>(
    () => [
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
      statusColumn<PackageTemplate>({
        accessorKey: 'status',
        header: 'Status',
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
            disabled: (t) => !can('PACKAGE_DELETE') || t.status !== 'ACTIVE',
          },
        ],
      }),
    ],
    [can, handleArchiveTemplate],
  );

  const versionColumns = useMemo<ColumnDef<PackageVersion>[]>(
    () => [
      textColumn<PackageVersion>({
        accessorKey: 'package_version_code',
        header: 'Code',
      }),
      textColumn<PackageVersion>({
        accessorKey: 'version_name',
        header: 'Name',
      }),
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
            label: 'Edit draft',
            onClick: (v) => void handleEditVersion(v),
            disabled: (v) => !can('PACKAGE_EDIT') || v.status !== 'DRAFT',
          },
          {
            label: 'Publish',
            onClick: (v) => handlePublishVersion(v.id),
            disabled: (v) => !can('PACKAGE_EDIT') || v.status !== 'DRAFT',
          },
          {
            label: 'Close early',
            onClick: (v) => handleCloseVersion(v.id),
            disabled: (v) => !can('PACKAGE_EDIT') || v.status !== 'PUBLISHED',
          },
          {
            label: 'Cancel',
            onClick: (v) => handleCancelVersion(v.id),
            disabled: (v) =>
              !can('PACKAGE_EDIT') ||
              !['DRAFT', 'PUBLISHED'].includes(v.status),
          },
        ],
      }),
    ],
    [
      can,
      handleCancelVersion,
      handleCloseVersion,
      handleEditVersion,
      handlePublishVersion,
    ],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Packages</h1>
        <p className="text-muted-foreground">
          Manage package templates and sellable versions.
        </p>
      </div>

      <PackageTemplateDialog
        mode="create"
        categories={categories}
        pilgrimageTypes={pilgrimageTypes}
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
        onSubmit={handleCreateTemplate}
      />

      <PackageTemplateDialog
        mode="edit"
        template={editingTemplate}
        categories={categories}
        pilgrimageTypes={pilgrimageTypes}
        open={editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTemplate(null);
        }}
        onSubmit={handleUpdateTemplate}
      />

      <PackageVersionDialog
        mode="create"
        templates={templates.filter((template) => template.status === 'ACTIVE')}
        currencies={currencies}
        seasons={seasons}
        open={createVersionOpen}
        onOpenChange={setCreateVersionOpen}
        onSubmit={handleCreateVersion}
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
        }}
        onSubmit={handleUpdateVersion}
      />

      <PackageDetailPanel
        template={viewingTemplate}
        version={viewingVersion}
        onClose={() => {
          setViewingTemplate(null);
          setViewingVersion(null);
        }}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-row items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Templates
              </h2>
              {can('PACKAGE_CREATE') && (
                <Button onClick={() => setCreateTemplateOpen(true)}>
                  + Add template
                </Button>
              )}
            </div>

            <DataTableToolbar
              filter={globalFilter}
              onFilterChange={(value) => {
                setGlobalFilter(value);
                setTemplatePagination((current) => ({
                  ...current,
                  pageIndex: 0,
                }));
              }}
            />

            <DataTable
              columns={templateColumns}
              data={templates}
              loading={loading}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              pagination={templatePagination}
              onPaginationChange={setTemplatePagination}
            />
          </div>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
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
              onFilterChange={(value) => {
                setGlobalFilter(value);
                setVersionPagination((current) => ({
                  ...current,
                  pageIndex: 0,
                }));
              }}
            />

            <DataTable
              columns={versionColumns}
              data={versions}
              loading={loading}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              pagination={versionPagination}
              onPaginationChange={setVersionPagination}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
