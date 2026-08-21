import type { ColumnDef } from '@tanstack/react-table';
import { Archive } from 'lucide-react';
import { Button } from '@kafi/ui';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn } from '../../../shared/data-table/columns';
import type { TravellerContact } from '../../../lib/api.js';
import { formatPhone } from '../../../shared/format';

interface TravellerContactsTableProps {
  contacts: TravellerContact[];
  loading?: boolean;
  onArchive?: (id: string) => Promise<void>;
}

function contactName(contact: TravellerContact): string {
  const person = contact.contact_person;
  if (!person) return '—';
  return [person.first_name, person.last_name].filter(Boolean).join(' ');
}

function contactRole(contact: TravellerContact): string {
  const roles = [
    contact.is_primary_contact ? 'Primary' : null,
    contact.is_emergency_contact ? 'Emergency' : null,
  ].filter(Boolean);
  return roles.join(' · ') || 'Standard';
}

export function TravellerContactsTable({
  contacts,
  loading,
  onArchive,
}: TravellerContactsTableProps) {
  const columns: ColumnDef<TravellerContact>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{contactName(row.original)}</span>
      ),
    },
    {
      id: 'phone_number',
      header: 'Phone',
      cell: ({ row }) => formatPhone(row.original.contact_person?.phone_number),
    },
    {
      id: 'relationship',
      header: 'Relationship',
      cell: ({ row }) => row.original.relationship_type?.name ?? '—',
    },
    {
      id: 'role',
      header: 'Contact type',
      cell: ({ row }) => contactRole(row.original),
    },
  ];

  if (onArchive) {
    columns.push(
      actionsColumn<TravellerContact>({
        actions: [
          {
            label: 'Archive',
            icon: Archive,
            onClick: (contact) => void onArchive(contact.id),
          },
        ],
      }),
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-lg border px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">
                  {contactName(contact)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatPhone(contact.contact_person?.phone_number)}
                </p>
              </div>
              {onArchive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  aria-label={`Archive ${contactName(contact)}`}
                  onClick={() => void onArchive(contact.id)}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">Relationship</p>
                <p className="mt-1 font-medium">
                  {contact.relationship_type?.name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact type</p>
                <p className="mt-1 font-medium">{contactRole(contact)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <DataTable columns={columns} data={contacts} loading={loading} />
      </div>
    </>
  );
}
