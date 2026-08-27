import { Archive, Pencil, Plus, MoreVertical, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kafi/ui';
import type { Traveller } from '../../../lib/api.js';
import { usePermissions } from '../../../core/permissions';
import { formatPhone } from '../../../shared/format';
import { WorkflowStatusBadge } from '../../../shared/operational-ui';

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

interface TravellerDetailCardProps {
  traveller: Traveller;
  onArchive?: (id: string) => Promise<void>;
  onAddContact?: () => void;
}

export function TravellerDetailCard({
  traveller,
  onArchive,
  onAddContact,
}: TravellerDetailCardProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const fullName = [
    traveller.first_name,
    traveller.middle_name,
    traveller.last_name,
  ]
    .filter(Boolean)
    .join(' ');
  const hasActions =
    (can('TRAVELLER_CREATE') && Boolean(onAddContact)) ||
    can('TRAVELLER_EDIT') ||
    (can('TRAVELLER_DELETE') && Boolean(onArchive));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="mt-0.5 hidden rounded-full bg-muted p-2.5 text-muted-foreground sm:block">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Traveller
              </p>
              <h1 className="mt-1 break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {fullName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {traveller.traveller_number}
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span>{formatPhone(traveller.phone_number)}</span>
                <WorkflowStatusBadge
                  status={traveller.status?.name
                    .toUpperCase()
                    .replaceAll(' ', '_')}
                />
              </div>
            </div>
          </div>

          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Traveller actions"
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {can('TRAVELLER_CREATE') && onAddContact && (
                  <DropdownMenuItem
                    onClick={onAddContact}
                    className="whitespace-nowrap"
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add contact
                  </DropdownMenuItem>
                )}
                {can('TRAVELLER_EDIT') && (
                  <DropdownMenuItem
                    onClick={() => navigate(`/travellers/${traveller.id}/edit`)}
                    className="whitespace-nowrap"
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit
                  </DropdownMenuItem>
                )}
                {can('TRAVELLER_DELETE') && onArchive && (
                  <DropdownMenuItem
                    className="whitespace-nowrap text-destructive focus:text-destructive"
                    onClick={() => void onArchive(traveller.id)}
                  >
                    <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="border-t px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
            <DetailGroup title="Personal information">
              <Detail
                label="Date of birth"
                value={formatDateOnly(traveller.date_of_birth)}
              />
              <Detail label="Gender" value={traveller.gender ?? '—'} />
              <Detail label="Country" value={traveller.country?.name ?? '—'} />
              <Detail label="Region" value={traveller.region?.name ?? '—'} />
            </DetailGroup>
            <DetailGroup title="Identity and contact">
              <Detail
                label="Phone"
                value={formatPhone(traveller.phone_number)}
              />
              <Detail label="Email" value={traveller.email_address ?? '—'} />
              <Detail
                label="Passport number"
                value={traveller.passport_number ?? '—'}
              />
              <Detail
                label="Fayda number"
                value={traveller.fayda_number ?? '—'}
              />
              <Detail
                label="Preferred language"
                value={traveller.preferred_language?.name ?? '—'}
              />
              <Detail label="Source" value={traveller.source?.name ?? '—'} />
            </DetailGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="mt-3 grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
