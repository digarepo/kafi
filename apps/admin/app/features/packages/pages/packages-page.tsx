import { useEffect, useState } from 'react';
import { usePermissions } from '../../../core/permissions';
import { Button, Input, Label } from '@kafi/ui';
import {
  api,
  type PackageCategory,
  type PilgrimageType,
  type Currency,
  type Season,
  type PackageTemplate,
  type PackageVersion,
  type CreatePackageTemplateInput,
  type CreatePackageVersionInput,
} from '../../../lib/api.js';

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
  const [editingTemplate, setEditingTemplate] =
    useState<PackageTemplate | null>(null);
  const [editingVersion, setEditingVersion] = useState<PackageVersion | null>(
    null,
  );
  const [viewingTemplate, setViewingTemplate] =
    useState<PackageTemplate | null>(null);
  const [viewingVersion, setViewingVersion] = useState<PackageVersion | null>(
    null,
  );

  function dateForInput(value: string | null | undefined) {
    return value ? value.split('T')[0] : '';
  }

  // template form
  const [templateForm, setTemplateForm] = useState<
    Partial<CreatePackageTemplateInput>
  >({});

  // version form
  const [versionForm, setVersionForm] = useState<
    Partial<CreatePackageVersionInput>
  >({
    inclusions: [],
  });
  const [inclusionText, setInclusionText] = useState('');

  function handleViewTemplate(t: PackageTemplate) {
    setViewingTemplate(t);
    setViewingVersion(null);
  }

  function handleViewVersion(v: PackageVersion) {
    setViewingVersion(v);
    setViewingTemplate(null);
  }

  function handleCloseView() {
    setViewingTemplate(null);
    setViewingVersion(null);
  }

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

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const payload = {
      name: templateForm.name ?? '',
      short_name: templateForm.short_name,
      description: templateForm.description,
      pilgrimage_type_id: templateForm.pilgrimage_type_id ?? '',
      package_category_id: templateForm.package_category_id ?? '',
      default_duration_days: Number(templateForm.default_duration_days ?? 0),
    };
    try {
      if (editingTemplate) {
        await api.updatePackageTemplate(editingTemplate.id, payload);
        setSuccess('Template updated');
      } else {
        await api.createPackageTemplate(payload as CreatePackageTemplateInput);
        setSuccess('Template created');
      }
      setTemplateForm({});
      setEditingTemplate(null);
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingTemplate
            ? 'Failed to update template'
            : 'Failed to create template',
      );
    }
  }

  function handleEditTemplate(t: PackageTemplate) {
    setEditingTemplate(t);
    setTemplateForm({
      name: t.name,
      short_name: t.short_name ?? '',
      description: t.description ?? '',
      pilgrimage_type_id: t.pilgrimage_type?.id ?? '',
      package_category_id: t.package_category?.id ?? '',
      default_duration_days: t.default_duration_days,
    });
  }

  function handleCancelEditTemplate() {
    setEditingTemplate(null);
    setTemplateForm({});
  }

  async function handleArchiveTemplate(id: string) {
    if (!confirm('Archive this template?')) return;
    setError(null);
    try {
      await api.archivePackageTemplate(id);
      setSuccess('Template archived');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleSaveVersion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const isPublished = editingVersion?.status === 'PUBLISHED';
    const base = {
      version_name: versionForm.version_name ?? '',
      slug: versionForm.slug,
      hero_image_url: versionForm.hero_image_url,
      sort_order: versionForm.sort_order ? Number(versionForm.sort_order) : 0,
      season_id: versionForm.season_id,
      year: Number(versionForm.year ?? new Date().getFullYear()),
      inclusions: versionForm.inclusions,
    };
    const payload = isPublished
      ? base
      : {
          ...base,
          package_template_id: versionForm.package_template_id ?? '',
          departure_date: versionForm.departure_date,
          return_date: versionForm.return_date,
          base_price: Number(versionForm.base_price ?? 0),
          currency_id: versionForm.currency_id ?? '',
          max_capacity: versionForm.max_capacity
            ? Number(versionForm.max_capacity)
            : undefined,
          sales_start_date: versionForm.sales_start_date,
          sales_end_date: versionForm.sales_end_date,
        };
    try {
      if (editingVersion) {
        await api.updatePackageVersion(editingVersion.id, payload);
        setSuccess('Version updated');
      } else {
        await api.createPackageVersion(payload as CreatePackageVersionInput);
        setSuccess('Version created');
      }
      setVersionForm({ inclusions: [] });
      setInclusionText('');
      setEditingVersion(null);
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingVersion
            ? 'Failed to update version'
            : 'Failed to create version',
      );
    }
  }

  async function handleEditVersion(v: PackageVersion) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const full = await api.getPackageVersion(v.id);
      setEditingVersion(full);
      setVersionForm({
        package_template_id: full.package_template_id,
        version_name: full.version_name,
        slug: full.slug,
        hero_image_url: full.hero_image_url ?? '',
        sort_order: full.sort_order,
        season_id: full.season_id ?? '',
        year: full.year,
        departure_date: dateForInput(full.departure_date),
        return_date: dateForInput(full.return_date),
        base_price: full.base_price,
        currency_id: full.currency_id,
        max_capacity: full.max_capacity ?? undefined,
        sales_start_date: dateForInput(full.sales_start_date),
        sales_end_date: dateForInput(full.sales_end_date),
        inclusions: full.inclusions,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load version details',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCancelEditVersion() {
    setEditingVersion(null);
    setVersionForm({ inclusions: [] });
    setInclusionText('');
  }

  async function handlePublishVersion(id: string) {
    setError(null);
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
    try {
      await api.archivePackageVersion(id);
      setSuccess('Version archived');
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  function addInclusion() {
    if (!inclusionText.trim()) return;
    const list = versionForm.inclusions ?? [];
    setVersionForm({
      ...versionForm,
      inclusions: [
        ...list,
        {
          inclusion_text: inclusionText.trim(),
          display_order: list.length + 1,
          is_highlighted: false,
        },
      ],
    });
    setInclusionText('');
  }

  function removeInclusion(index: number) {
    const list = (versionForm.inclusions ?? []).filter((_, i) => i !== index);
    setVersionForm({ ...versionForm, inclusions: list });
  }

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

      {(viewingTemplate || viewingVersion) && (
        <div className="space-y-2 rounded border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Details</h2>
            <Button size="sm" variant="ghost" onClick={handleCloseView}>
              Close
            </Button>
          </div>
          {viewingTemplate && (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Code</dt>
              <dd>{viewingTemplate.package_template_code}</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{viewingTemplate.name}</dd>
              <dt className="text-muted-foreground">Short name</dt>
              <dd>{viewingTemplate.short_name ?? '-'}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{viewingTemplate.package_category?.name ?? '-'}</dd>
              <dt className="text-muted-foreground">Pilgrimage type</dt>
              <dd>{viewingTemplate.pilgrimage_type?.name ?? '-'}</dd>
              <dt className="text-muted-foreground">Duration</dt>
              <dd>{viewingTemplate.default_duration_days}d</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd>{viewingTemplate.description ?? '-'}</dd>
            </dl>
          )}
          {viewingVersion && (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Code</dt>
              <dd>{viewingVersion.package_version_code}</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{viewingVersion.version_name}</dd>
              <dt className="text-muted-foreground">Template</dt>
              <dd>{viewingVersion.package_template?.name ?? '-'}</dd>
              <dt className="text-muted-foreground">Slug</dt>
              <dd>{viewingVersion.slug}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{viewingVersion.status_name}</dd>
              <dt className="text-muted-foreground">Year</dt>
              <dd>{viewingVersion.year}</dd>
              <dt className="text-muted-foreground">Departure</dt>
              <dd>
                {viewingVersion.departure_date
                  ? dateForInput(viewingVersion.departure_date)
                  : '-'}
              </dd>
              <dt className="text-muted-foreground">Return</dt>
              <dd>
                {viewingVersion.return_date
                  ? dateForInput(viewingVersion.return_date)
                  : '-'}
              </dd>
              <dt className="text-muted-foreground">Sales start</dt>
              <dd>
                {viewingVersion.sales_start_date
                  ? dateForInput(viewingVersion.sales_start_date)
                  : '-'}
              </dd>
              <dt className="text-muted-foreground">Sales end</dt>
              <dd>
                {viewingVersion.sales_end_date
                  ? dateForInput(viewingVersion.sales_end_date)
                  : '-'}
              </dd>
              <dt className="text-muted-foreground">Base price</dt>
              <dd>{viewingVersion.base_price}</dd>
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{viewingVersion.currency?.code ?? '-'}</dd>
              <dt className="text-muted-foreground">Max capacity</dt>
              <dd>{viewingVersion.max_capacity ?? '-'}</dd>
              <dt className="text-muted-foreground">Season</dt>
              <dd>{viewingVersion.season?.name ?? '-'}</dd>
              <dt className="text-muted-foreground">Inclusions</dt>
              <dd>
                {viewingVersion.inclusions.length ? (
                  <ul className="list-disc pl-4">
                    {viewingVersion.inclusions.map((inc) => (
                      <li key={inc.id}>{inc.inclusion_text}</li>
                    ))}
                  </ul>
                ) : (
                  '-'
                )}
              </dd>
            </dl>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-6">
          {can('PACKAGE_CREATE') && (
            <form
              onSubmit={handleSaveTemplate}
              className="space-y-4 rounded border p-4"
            >
              <h2 className="font-semibold">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={templateForm.name ?? ''}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Short name</Label>
                  <Input
                    value={templateForm.short_name ?? ''}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        short_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pilgrimage type</Label>
                  <select
                    className="h-9 w-full rounded border px-2"
                    value={templateForm.pilgrimage_type_id ?? ''}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        pilgrimage_type_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select…</option>
                    {pilgrimageTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="h-9 w-full rounded border px-2"
                    value={templateForm.package_category_id ?? ''}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        package_category_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Default duration (days)</Label>
                  <Input
                    type="number"
                    value={templateForm.default_duration_days ?? ''}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        default_duration_days: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={templateForm.description ?? ''}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {editingTemplate
                    ? 'Update template'
                    : loading
                      ? 'Saving…'
                      : 'Create template'}
                </Button>
                {editingTemplate && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEditTemplate}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Templates</h2>
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="py-2">Code</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">
                        {t.package_template_code}
                      </td>
                      <td className="py-2">{t.name}</td>
                      <td className="py-2">
                        {t.package_category?.name ?? '-'}
                      </td>
                      <td className="py-2">{t.pilgrimage_type?.name ?? '-'}</td>
                      <td className="py-2">{t.default_duration_days}d</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {can('PACKAGE_VIEW') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTemplate(t)}
                            >
                              View
                            </Button>
                          )}
                          {can('PACKAGE_EDIT') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTemplate(t)}
                            >
                              Edit
                            </Button>
                          )}
                          {can('PACKAGE_DELETE') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveTemplate(t.id)}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'versions' && (
        <div className="space-y-6">
          {can('PACKAGE_CREATE') && (
            <form
              onSubmit={handleSaveVersion}
              className="space-y-4 rounded border p-4"
            >
              <h2 className="font-semibold">
                {editingVersion ? 'Edit Version' : 'New Version'}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <select
                    className="h-9 w-full rounded border px-2"
                    value={versionForm.package_template_id ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        package_template_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Version name</Label>
                  <Input
                    value={versionForm.version_name ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        version_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (optional)</Label>
                  <Input
                    value={versionForm.slug ?? ''}
                    onChange={(e) =>
                      setVersionForm({ ...versionForm, slug: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hero image URL</Label>
                  <Input
                    value={versionForm.hero_image_url ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        hero_image_url: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={versionForm.sort_order ?? 0}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        sort_order: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={versionForm.year ?? new Date().getFullYear()}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        year: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure date</Label>
                  <Input
                    type="date"
                    value={versionForm.departure_date ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        departure_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Return date</Label>
                  <Input
                    type="date"
                    value={versionForm.return_date ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        return_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={versionForm.base_price ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        base_price: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    className="h-9 w-full rounded border px-2"
                    value={versionForm.currency_id ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        currency_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select…</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Season</Label>
                  <select
                    className="h-9 w-full rounded border px-2"
                    value={versionForm.season_id ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        season_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Select…</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Max capacity</Label>
                  <Input
                    type="number"
                    value={versionForm.max_capacity ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        max_capacity: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sales start date</Label>
                  <Input
                    type="date"
                    value={versionForm.sales_start_date ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        sales_start_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sales end date</Label>
                  <Input
                    type="date"
                    value={versionForm.sales_end_date ?? ''}
                    onChange={(e) =>
                      setVersionForm({
                        ...versionForm,
                        sales_end_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Inclusions</Label>
                <div className="flex gap-2">
                  <Input
                    value={inclusionText}
                    onChange={(e) => setInclusionText(e.target.value)}
                    placeholder="e.g. 4-star hotel"
                  />
                  <Button type="button" onClick={addInclusion}>
                    Add
                  </Button>
                </div>
                <ul className="space-y-1">
                  {(versionForm.inclusions ?? []).map((inc, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded border p-2 text-sm"
                    >
                      <span>{inc.inclusion_text}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeInclusion(idx)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {editingVersion
                    ? 'Update version'
                    : loading
                      ? 'Saving…'
                      : 'Create version'}
                </Button>
                {editingVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEditVersion}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Versions</h2>
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="py-2">Code</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Template</th>
                    <th className="py-2">Slug</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">
                        {v.package_version_code}
                      </td>
                      <td className="py-2">{v.version_name}</td>
                      <td className="py-2">
                        {v.package_template?.name ?? '-'}
                      </td>
                      <td className="py-2">{v.slug}</td>
                      <td className="py-2">{v.status_name}</td>
                      <td className="py-2">{v.base_price}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          {can('PACKAGE_VIEW') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewVersion(v)}
                            >
                              View
                            </Button>
                          )}
                          {can('PACKAGE_EDIT') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditVersion(v)}
                            >
                              Edit
                            </Button>
                          )}
                          {can('PACKAGE_EDIT') && v.status !== 'PUBLISHED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePublishVersion(v.id)}
                            >
                              Publish
                            </Button>
                          )}
                          {can('PACKAGE_DELETE') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchiveVersion(v.id)}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
