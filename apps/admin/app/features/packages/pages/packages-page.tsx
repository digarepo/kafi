import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Archive,
  Ban,
  DoorClosed,
  Eye,
  Globe,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  cn,
} from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { useRenderProfile } from '../../../dev/render-profile';
import { DataTable } from '../../../shared/data-table';
import {
  actionsColumn,
  statusColumn,
  textColumn,
} from '../../../shared/data-table/columns';
import { formatMoney } from '../../../shared/format';
import { displayDate } from '../../operations/lib/date';
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

const DEFAULT_PAGE_SIZE = 10;

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
  const [templateSearch, setTemplateSearch] = useState('');
  const [versionSearch, setVersionSearch] = useState('');
  const [versionTemplateFilter, setVersionTemplateFilter] = useState('');
  const [templatePagination, setTemplatePagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [versionPagination, setVersionPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
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
                api.listPackageTemplates(1, 100),
              ])
            : Promise.resolve(null);
        const templatesPromise =
          scope === 'all' || scope === 'templates'
            ? api.listPackageTemplates(
                templatePagination.pageIndex + 1,
                templatePagination.pageSize,
                scope === 'templates' || tab === 'templates'
                  ? templateSearch || undefined
                  : undefined,
              )
            : Promise.resolve(null);
        const versionsPromise =
          scope === 'all' || scope === 'versions'
            ? api.listPackageVersions(
                versionPagination.pageIndex + 1,
                versionPagination.pageSize,
                versionTemplateFilter || undefined,
                scope === 'versions' || tab === 'versions'
                  ? versionSearch || undefined
                  : undefined,
              )
            : Promise.resolve(null);
        const [references, tpl, ver] = await Promise.all([
          referencesPromise,
          templatesPromise,
          versionsPromise,
        ]);

        if (references) {
          const [cat, pt, cur, sea, allTemplates] = references;
          setCategories(cat);
          setPilgrimageTypes(pt);
          setCurrencies(cur);
          setSeasons(sea);
          setTemplates(allTemplates.data);
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
      tab,
      templatePagination.pageIndex,
      templatePagination.pageSize,
      templateSearch,
      versionPagination.pageIndex,
      versionPagination.pageSize,
      versionSearch,
      versionTemplateFilter,
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
            icon: Eye,
            onClick: (t) => {
              setViewingTemplate(t);
              setViewingVersion(null);
            },
            disabled: () => !can('PACKAGE_VIEW'),
          },
          {
            label: 'Edit',
            icon: Pencil,
            onClick: (t) => setEditingTemplate(t),
            disabled: () => !can('PACKAGE_EDIT'),
          },
          {
            label: 'Archive',
            icon: Archive,
            variant: 'destructive',
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
      {
        id: 'departure_date',
        header: 'Departure',
        accessorKey: 'departure_date',
        enableSorting: false,
        cell: ({ row }) => displayDate(row.original.departure_date),
      },
      {
        id: 'return_date',
        header: 'Return',
        accessorKey: 'return_date',
        enableSorting: false,
        cell: ({ row }) => displayDate(row.original.return_date),
      },
      {
        id: 'base_price',
        header: 'Price',
        enableSorting: false,
        cell: ({ row }) => formatMoney(row.original.base_price),
      },
      statusColumn<PackageVersion>({
        accessorKey: 'status',
        header: 'Status',
      }),
      actionsColumn<PackageVersion>({
        actions: [
          {
            label: 'View',
            icon: Eye,
            onClick: (v) => {
              setViewingVersion(v);
              setViewingTemplate(null);
            },
            disabled: () => !can('PACKAGE_VIEW'),
          },
          {
            label: 'Edit draft',
            icon: Pencil,
            onClick: (v) => void handleEditVersion(v),
            disabled: (v) => !can('PACKAGE_EDIT') || v.status !== 'DRAFT',
          },
          {
            label: 'Publish',
            icon: Globe,
            onClick: (v) => handlePublishVersion(v.id),
            disabled: (v) => !can('PACKAGE_EDIT') || v.status !== 'DRAFT',
          },
          {
            label: 'Close early',
            icon: DoorClosed,
            onClick: (v) => handleCloseVersion(v.id),
            disabled: (v) => !can('PACKAGE_EDIT') || v.status !== 'PUBLISHED',
          },
          {
            label: 'Cancel',
            icon: Ban,
            variant: 'destructive',
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

  const hasTemplateFilters = Boolean(templateSearch);
  const hasVersionFilters = Boolean(versionSearch || versionTemplateFilter);

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Templates
              </h2>
              {can('PACKAGE_CREATE') && (
                <Button
                  className="hidden sm:inline-flex"
                  onClick={() => setCreateTemplateOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add template
                </Button>
              )}
              {can('PACKAGE_CREATE') && (
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
                  onClick={() => setCreateTemplateOpen(true)}
                  aria-label="Add template"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={templateSearch}
                  onChange={(e) => {
                    setTemplateSearch(e.target.value);
                    setTemplatePagination((c) => ({ ...c, pageIndex: 0 }));
                  }}
                  placeholder="Search templates…"
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  aria-label="Search templates"
                />
              </div>
              {hasTemplateFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 self-start text-muted-foreground lg:self-center"
                  onClick={() => {
                    setTemplateSearch('');
                    setTemplatePagination((c) => ({ ...c, pageIndex: 0 }));
                  }}
                  aria-label="Clear filters"
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <DataTable
              columns={templateColumns}
              data={templates}
              loading={loading}
              pagination={templatePagination}
              onPaginationChange={setTemplatePagination}
            />
          </div>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Versions</h2>
              {can('PACKAGE_CREATE') && (
                <Button
                  className="hidden sm:inline-flex"
                  onClick={() => setCreateVersionOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add version
                </Button>
              )}
              {can('PACKAGE_CREATE') && (
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
                  onClick={() => setCreateVersionOpen(true)}
                  aria-label="Add version"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={versionSearch}
                  onChange={(e) => {
                    setVersionSearch(e.target.value);
                    setVersionPagination((c) => ({ ...c, pageIndex: 0 }));
                  }}
                  placeholder="Search versions…"
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  aria-label="Search versions"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
                <div className="lg:w-56">
                  <Select
                    value={versionTemplateFilter}
                    onValueChange={(v) => {
                      setVersionTemplateFilter(v ?? '');
                      setVersionPagination((c) => ({ ...c, pageIndex: 0 }));
                    }}
                  >
                    <SelectTrigger className={cn('h-9 w-full')}>
                      <SelectValue>
                        {versionTemplateFilter
                          ? (templates.find(
                              (t) => t.id === versionTemplateFilter,
                            )?.name ?? 'Template')
                          : 'All templates'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All templates</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasVersionFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 self-start text-muted-foreground lg:self-center"
                  onClick={() => {
                    setVersionSearch('');
                    setVersionTemplateFilter('');
                    setVersionPagination((c) => ({ ...c, pageIndex: 0 }));
                  }}
                  aria-label="Clear filters"
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <DataTable
              columns={versionColumns}
              data={versions}
              loading={loading}
              pagination={versionPagination}
              onPaginationChange={setVersionPagination}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
