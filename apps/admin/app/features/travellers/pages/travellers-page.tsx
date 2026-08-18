/**
 * Admin travellers page.
 *
 * @remarks
 * - Groups travellers, contact persons, and registrations into tabbed views.
 * - Creates and edits use the dedicated dialog/form components in
 *   `apps/admin/app/features/travellers/components`.
 * - Mobile-first: tab list fills the width on small screens and toolbars stack.
 */

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  api,
  type ContactPerson,
  type Country,
  type CreateContactPersonInput,
  type CreateRegistrationInput,
  type CreateTravellerInput,
  type Language,
  type LookupOption,
  type PackageVersion,
  type Registration,
  type Traveller,
  type UpdateContactPersonInput,
  type UpdateTravellerInput,
} from '../../../lib/api.js';
import { ContactPersonDialog } from '../components/contact-person-dialog';
import { RegistrationDialog } from '../components/registration-dialog';
import { TravellerDialog } from '../components/traveller-dialog';
import type {
  ContactPersonFormOutput,
  RegistrationFormOutput,
  TravellerFormOutput,
} from '../types/travellers.types';

type Tab = 'travellers' | 'contacts' | 'registrations';

/**
 * Render the travellers admin page with tabs and CRUD dialogs.
 *
 * @returns The travellers admin page element.
 */
export function TravellersPage() {
  const { can } = usePermissions();
  const [tab, setTab] = useState<Tab>('travellers');

  // Reference data
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [travellerStatuses, setTravellerStatuses] = useState<LookupOption[]>(
    [],
  );
  const [travellerSources, setTravellerSources] = useState<LookupOption[]>([]);
  const [contactStatuses, setContactStatuses] = useState<LookupOption[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);

  // Entity data
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  // Dialog state
  const [createTravellerOpen, setCreateTravellerOpen] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<Traveller | null>(
    null,
  );
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(
    null,
  );
  const [createRegistrationOpen, setCreateRegistrationOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] =
    useState<Registration | null>(null);

  /**
   * Load static reference data on mount.
   */
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [c, l, ts, src, cs, pv] = await Promise.all([
          api.listCountries(),
          api.listLanguages(),
          api.listTravellerStatuses(),
          api.listTravellerSources(),
          api.listContactPersonStatuses(),
          api.listPackageVersions(1, 100),
        ]);
        setCountries(c);
        setLanguages(l);
        setTravellerStatuses(ts);
        setTravellerSources(src);
        setContactStatuses(cs);
        setPackageVersions(pv.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load reference data',
        );
      }
    }

    void loadReferenceData();
  }, []);

  /**
   * Load the active tab's entity data whenever the tab changes.
   */
  useEffect(() => {
    async function loadTabData() {
      setLoading(true);
      setError(null);
      try {
        if (tab === 'travellers') {
          const res = await api.listTravellers(1, 100);
          setTravellers(res.data);
        } else if (tab === 'contacts') {
          const res = await api.listContactPersons(1, 100);
          setContacts(res.data);
        } else {
          const res = await api.listRegistrations(1, 100);
          setRegistrations(res.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    void loadTabData();
  }, [tab]);

  /**
   * Refresh the current tab after a mutation.
   */
  async function refreshActiveTab() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'travellers') {
        const res = await api.listTravellers(1, 100);
        setTravellers(res.data);
      } else if (tab === 'contacts') {
        const res = await api.listContactPersons(1, 100);
        setContacts(res.data);
      } else {
        const res = await api.listRegistrations(1, 100);
        setRegistrations(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Open the traveller edit dialog.
   *
   * @remarks
   * `TravellerForm` loads its own regions based on the traveller's country.
   *
   * @param t - The traveller to edit.
   */
  function handleEditTraveller(t: Traveller) {
    setEditingTraveller(t);
  }

  async function handleCreateTraveller(values: TravellerFormOutput) {
    setError(null);
    setSuccess(null);
    try {
      await api.createTraveller(values as CreateTravellerInput);
      setSuccess('Traveller created');
      setCreateTravellerOpen(false);
      await refreshActiveTab();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create traveller',
      );
    }
  }

  async function handleUpdateTraveller(values: TravellerFormOutput) {
    if (!editingTraveller) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updateTraveller(
        editingTraveller.id,
        values as UpdateTravellerInput,
      );
      setSuccess('Traveller updated');
      setEditingTraveller(null);
      await refreshActiveTab();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update traveller',
      );
    }
  }

  async function handleArchiveTraveller(id: string) {
    if (!confirm('Archive this traveller?')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.archiveTraveller(id);
      setSuccess('Traveller archived');
      await refreshActiveTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  /**
   * Open the contact person edit dialog.
   *
   * @remarks
   * `ContactPersonForm` loads its own regions based on the contact's country.
   *
   * @param c - The contact person to edit.
   */
  function handleEditContact(c: ContactPerson) {
    setEditingContact(c);
  }

  async function handleCreateContact(values: ContactPersonFormOutput) {
    setError(null);
    setSuccess(null);
    try {
      await api.createContactPerson(values as CreateContactPersonInput);
      setSuccess('Contact person created');
      setCreateContactOpen(false);
      await refreshActiveTab();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create contact person',
      );
    }
  }

  async function handleUpdateContact(values: ContactPersonFormOutput) {
    if (!editingContact) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updateContactPerson(
        editingContact.id,
        values as UpdateContactPersonInput,
      );
      setSuccess('Contact person updated');
      setEditingContact(null);
      await refreshActiveTab();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update contact person',
      );
    }
  }

  async function handleArchiveContact(id: string) {
    if (!confirm('Archive this contact person?')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.archiveContactPerson(id);
      setSuccess('Contact person archived');
      await refreshActiveTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleEditRegistration(r: Registration) {
    setEditingRegistration(r);
  }

  async function handleCreateRegistration(values: RegistrationFormOutput) {
    setError(null);
    setSuccess(null);
    try {
      await api.createRegistration(values as CreateRegistrationInput);
      setSuccess('Registration created');
      setCreateRegistrationOpen(false);
      await refreshActiveTab();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create registration',
      );
    }
  }

  async function handleUpdateRegistration(values: RegistrationFormOutput) {
    if (!editingRegistration) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updateRegistration(editingRegistration.id, {
        expected_departure_date: values.expected_departure_date,
        expected_return_date: values.expected_return_date,
        remarks: values.remarks,
      });
      setSuccess('Registration updated');
      setEditingRegistration(null);
      await refreshActiveTab();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update registration',
      );
    }
  }

  async function handleArchiveRegistration(id: string) {
    if (!confirm('Archive this registration?')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.archiveRegistration(id);
      setSuccess('Registration archived');
      await refreshActiveTab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  const travellerColumns: ColumnDef<Traveller>[] = [
    textColumn<Traveller>({
      accessorKey: 'traveller_number',
      header: 'Number',
    }),
    textColumn<Traveller>({ accessorKey: 'first_name', header: 'First name' }),
    textColumn<Traveller>({ accessorKey: 'last_name', header: 'Last name' }),
    textColumn<Traveller>({ accessorKey: 'phone_number', header: 'Phone' }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    {
      id: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => row.original.source?.name ?? '-',
    },
    actionsColumn<Traveller>({
      actions: [
        {
          label: 'Edit',
          onClick: (t) => void handleEditTraveller(t),
          disabled: () => !can('TRAVELLER_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (t) => handleArchiveTraveller(t.id),
          disabled: () => !can('TRAVELLER_DELETE'),
        },
      ],
    }),
  ];

  const contactColumns: ColumnDef<ContactPerson>[] = [
    textColumn<ContactPerson>({
      accessorKey: 'first_name',
      header: 'First name',
    }),
    textColumn<ContactPerson>({
      accessorKey: 'last_name',
      header: 'Last name',
    }),
    textColumn<ContactPerson>({ accessorKey: 'phone_number', header: 'Phone' }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<ContactPerson>({
      actions: [
        {
          label: 'Edit',
          onClick: (c) => void handleEditContact(c),
          disabled: () => !can('TRAVELLER_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (c) => handleArchiveContact(c.id),
          disabled: () => !can('TRAVELLER_DELETE'),
        },
      ],
    }),
  ];

  const registrationColumns: ColumnDef<Registration>[] = [
    textColumn<Registration>({
      accessorKey: 'registration_number',
      header: 'Number',
    }),
    {
      id: 'traveller',
      header: 'Traveller',
      enableSorting: false,
      cell: ({ row }) => row.original.traveller?.full_name ?? '-',
    },
    {
      id: 'package',
      header: 'Package',
      enableSorting: false,
      cell: ({ row }) => row.original.package_version?.version_name ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status_name ?? row.original.status ?? '-',
    },
    actionsColumn<Registration>({
      actions: [
        {
          label: 'Edit',
          onClick: (r) => void handleEditRegistration(r),
          disabled: () => !can('REGISTRATION_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (r) => handleArchiveRegistration(r.id),
          disabled: () => !can('REGISTRATION_DELETE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Travellers</h1>
        <p className="text-muted-foreground">
          Manage travellers, contact persons, and registrations.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      )}

      <TravellerDialog
        mode="create"
        countries={countries}
        languages={languages}
        sources={travellerSources}
        statuses={travellerStatuses}
        open={createTravellerOpen}
        onOpenChange={(open) => {
          setCreateTravellerOpen(open);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleCreateTraveller}
        error={createTravellerOpen ? error : null}
        success={createTravellerOpen ? success : null}
      />

      <TravellerDialog
        mode="edit"
        traveller={editingTraveller}
        countries={countries}
        languages={languages}
        sources={travellerSources}
        statuses={travellerStatuses}
        open={editingTraveller !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTraveller(null);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleUpdateTraveller}
        error={editingTraveller !== null ? error : null}
        success={editingTraveller !== null ? success : null}
      />

      <ContactPersonDialog
        mode="create"
        countries={countries}
        languages={languages}
        statuses={contactStatuses}
        open={createContactOpen}
        onOpenChange={(open) => {
          setCreateContactOpen(open);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleCreateContact}
        error={createContactOpen ? error : null}
        success={createContactOpen ? success : null}
      />

      <ContactPersonDialog
        mode="edit"
        contactPerson={editingContact}
        countries={countries}
        languages={languages}
        statuses={contactStatuses}
        open={editingContact !== null}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleUpdateContact}
        error={editingContact !== null ? error : null}
        success={editingContact !== null ? success : null}
      />

      <RegistrationDialog
        mode="create"
        travellers={travellers}
        packageVersions={packageVersions}
        open={createRegistrationOpen}
        onOpenChange={(open) => {
          setCreateRegistrationOpen(open);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleCreateRegistration}
        error={createRegistrationOpen ? error : null}
        success={createRegistrationOpen ? success : null}
      />

      <RegistrationDialog
        mode="edit"
        registration={editingRegistration}
        travellers={travellers}
        packageVersions={packageVersions}
        open={editingRegistration !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRegistration(null);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleUpdateRegistration}
        error={editingRegistration !== null ? error : null}
        success={editingRegistration !== null ? success : null}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="travellers">Travellers</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="travellers" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Travellers</h2>
            {can('TRAVELLER_CREATE') && (
              <Button
                onClick={() => setCreateTravellerOpen(true)}
                className="w-full sm:w-auto"
              >
                + Add traveller
              </Button>
            )}
          </div>

          <DataTableToolbar
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
          />

          <DataTable
            columns={travellerColumns}
            data={travellers}
            loading={loading}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Contact persons
            </h2>
            {can('TRAVELLER_CREATE') && (
              <Button
                onClick={() => setCreateContactOpen(true)}
                className="w-full sm:w-auto"
              >
                + Add contact person
              </Button>
            )}
          </div>

          <DataTableToolbar
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
          />

          <DataTable
            columns={contactColumns}
            data={contacts}
            loading={loading}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </TabsContent>

        <TabsContent value="registrations" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold tracking-tight">
              Registrations
            </h2>
            {can('REGISTRATION_CREATE') && (
              <Button
                onClick={() => setCreateRegistrationOpen(true)}
                className="w-full sm:w-auto"
              >
                + Add registration
              </Button>
            )}
          </div>

          <DataTableToolbar
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
          />

          <DataTable
            columns={registrationColumns}
            data={registrations}
            loading={loading}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
