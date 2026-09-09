import { useEffect, useMemo, useState } from 'react';
import { Bus, Clock3, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DateTimeRangePicker,
  formatCalendarDateTime,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';
import { toast } from 'sonner';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import {
  api,
  type CreateTransportSegmentInput,
  type TravelGroupOperationalSummary,
  type TravelGroupTransportSegment,
} from '../../../lib/api.js';
import { logisticsApi, type Vendor } from '../../../lib/logistics-api';
import { WorkflowStatusBadge } from '../../../shared/operational-ui';

const LOCATION_TYPES = [
  ['AIRPORT', 'Airport'],
  ['HOTEL', 'Hotel'],
  ['RELIGIOUS_SITE', 'Religious site'],
  ['OTHER', 'Other'],
] as const;

type LocationType = NonNullable<CreateTransportSegmentInput['origin_type']>;

interface Props {
  group: TravelGroupOperationalSummary;
  canManage: boolean;
  onChanged: () => void;
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toLocaleString()} ETB`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatCalendarDateTime(date);
}

function durationLabel(
  departure: string | null | undefined,
  arrival: string | null | undefined,
): string | null {
  if (!departure || !arrival) return null;
  const minutes = Math.round(
    (new Date(arrival).getTime() - new Date(departure).getTime()) / 60000,
  );
  return minutes > 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : null;
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 16)
    : formatDateTimeInput(date);
}

function parseDateTimeInput(value: string): Date | undefined {
  if (!value) return undefined;
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateTimeInput(value?: Date): string {
  if (!value) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function GroundTransportWorkspace({
  group,
  canManage,
  onChanged,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] =
    useState<TravelGroupTransportSegment | null>(null);
  const { confirm } = useDestructiveConfirmation();
  const segments = group.logistics.transport_segments;

  async function handleDelete(segment: TravelGroupTransportSegment) {
    if (
      !(await confirm({
        title: 'Delete transport segment?',
        description: `${segment.origin_location} → ${segment.destination_location} will be removed from this group.`,
        confirmLabel: 'Delete',
      }))
    )
      return;

    try {
      await api.deleteTransportSegment(segment.id);
      onChanged();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not delete transport segment',
      );
    }
  }

  function openCreate() {
    setEditingSegment(null);
    setDialogOpen(true);
  }

  return (
    <div id="transport" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ground transport</h3>
          <p className="text-sm text-muted-foreground">
            Confirmed vehicle movements and driver details for this group.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add transport
          </Button>
        )}
      </div>

      {segments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Bus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No transport segments configured</p>
            <p className="text-sm text-muted-foreground">
              Add a confirmed vehicle movement to complete ground transport
              planning.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {segments.map((segment, index) => (
            <Card key={segment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="break-words text-base">
                        {segment.origin_location} →{' '}
                        {segment.destination_location}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {segment.vehicle_type?.name ??
                          'Vehicle type unavailable'}
                        {segment.vehicle_plate_number
                          ? ` · ${segment.vehicle_plate_number}`
                          : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <WorkflowStatusBadge status={segment.status?.code} />
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Transport segment actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingSegment(segment);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleDelete(segment)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Departure</p>
                    <p className="mt-1 font-medium">
                      {formatDateTime(segment.departure_datetime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Arrival</p>
                    <p className="mt-1 font-medium">
                      {formatDateTime(segment.arrival_datetime)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {durationLabel(
                    segment.departure_datetime,
                    segment.arrival_datetime,
                  ) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {durationLabel(
                        segment.departure_datetime,
                        segment.arrival_datetime,
                      )}
                    </span>
                  )}
                  <span>{segment.vendor?.name ?? 'Independent vehicle'}</span>
                  <span>{formatMoney(segment.transport_cost)}</span>
                </div>
                {(segment.driver_name ||
                  segment.driver_phone_number ||
                  segment.vehicle_identifier) && (
                  <p className="text-sm text-muted-foreground">
                    {[
                      segment.driver_name,
                      segment.driver_phone_number,
                      segment.vehicle_identifier,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {segment.notes && (
                  <p className="text-sm text-muted-foreground">
                    {segment.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TransportFormDialog
        groupId={group.id}
        groupName={group.name}
        segment={editingSegment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setDialogOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}

interface TransportFormDialogProps {
  groupId: string;
  groupName: string;
  segment: TravelGroupTransportSegment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function TransportFormDialog({
  groupId,
  groupName,
  segment,
  open,
  onOpenChange,
  onSaved,
}: TransportFormDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<
    { id: string; name: string }[]
  >([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originType, setOriginType] = useState<LocationType | ''>('');
  const [destinationType, setDestinationType] = useState<LocationType | ''>('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleIdentifier, setVehicleIdentifier] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingLookups(true);
    Promise.all([logisticsApi.listVendors(1, 100), api.listVehicleTypes()])
      .then(([vendorResult, vehicleTypeResult]) => {
        setVendors(vendorResult.data);
        setVehicleTypes(vehicleTypeResult);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Transport lookups could not be loaded',
        ),
      )
      .finally(() => setLoadingLookups(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setOrigin(segment?.origin_location ?? '');
    setDestination(segment?.destination_location ?? '');
    setOriginType((segment?.origin_type as LocationType | null) ?? '');
    setDestinationType(
      (segment?.destination_type as LocationType | null) ?? '',
    );
    setVehicleTypeId(segment?.vehicle_type_id ?? '');
    setPlate(segment?.vehicle_plate_number ?? '');
    setVehicleIdentifier(segment?.vehicle_identifier ?? '');
    setVendorId(segment?.vendor?.id ?? '');
    setDriverName(segment?.driver_name ?? '');
    setDriverPhone(segment?.driver_phone_number ?? '');
    setDeparture(toLocalDateTime(segment?.departure_datetime));
    setArrival(toLocalDateTime(segment?.arrival_datetime));
    setCost(
      segment?.transport_cost != null ? String(segment.transport_cost) : '',
    );
    setNotes(segment?.notes ?? '');
    setError(null);
  }, [open, segment]);

  const duration = useMemo(
    () => durationLabel(departure, arrival),
    [departure, arrival],
  );

  async function submit() {
    setSaving(true);
    setError(null);
    const costNumber = Number(cost);
    if (
      !origin.trim() ||
      !destination.trim() ||
      !vehicleTypeId ||
      !plate.trim()
    ) {
      setError(
        'Origin, destination, vehicle type, and plate number are required',
      );
      setSaving(false);
      return;
    }
    if (!cost.trim() || !Number.isFinite(costNumber) || costNumber <= 0) {
      setError('Transport cost must be a positive amount in ETB');
      setSaving(false);
      return;
    }
    if (
      (departure && !arrival) ||
      (!departure && arrival) ||
      (departure && arrival && arrival <= departure)
    ) {
      setError('Arrival must be after departure when times are provided');
      setSaving(false);
      return;
    }

    const input: CreateTransportSegmentInput = {
      origin_location: origin.trim(),
      destination_location: destination.trim(),
      origin_type: originType || undefined,
      destination_type: destinationType || undefined,
      vehicle_type_id: vehicleTypeId,
      vehicle_plate_number: plate.trim().toUpperCase(),
      vehicle_identifier: vehicleIdentifier.trim() || undefined,
      vendor_id: vendorId || undefined,
      driver_name: driverName.trim() || undefined,
      driver_phone_number: driverPhone.trim() || undefined,
      departure_datetime: departure
        ? new Date(departure).toISOString()
        : undefined,
      arrival_datetime: arrival ? new Date(arrival).toISOString() : undefined,
      transport_cost: costNumber,
      notes: notes.trim() || undefined,
    };

    try {
      if (segment) await api.updateTransportSegment(segment.id, input);
      else await api.createTransportSegment(groupId, input);
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Transport segment could not be saved',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="flex flex-col items-start gap-2 text-left sm:flex-col sm:items-start sm:gap-2 sm:text-left">
          <DialogTitle>
            {segment ? 'Edit transport segment' : 'Add ground transport'}
          </DialogTitle>
          <DialogDescription>
            {segment
              ? 'Update the confirmed vehicle movement.'
              : `Record a confirmed vehicle movement for ${groupName}.`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-5">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Route</h3>
              <p className="text-xs text-muted-foreground">
                Define the movement and its operational locations.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Origin"
                required
                value={origin}
                onChange={setOrigin}
                placeholder="e.g. Jeddah Airport"
              />
              <Field
                label="Destination"
                required
                value={destination}
                onChange={setDestination}
                placeholder="e.g. Hilton Makkah"
              />
              <Lookup
                label="Origin type"
                value={originType}
                onChange={(value) => setOriginType(value as LocationType | '')}
                options={LOCATION_TYPES}
              />
              <Lookup
                label="Destination type"
                value={destinationType}
                onChange={(value) =>
                  setDestinationType(value as LocationType | '')
                }
                options={LOCATION_TYPES}
              />
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div>
              <h3 className="text-sm font-semibold">Vehicle and provider</h3>
              <p className="text-xs text-muted-foreground">
                Capture the confirmed vehicle, supplier, and driver details.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Lookup
                label="Vehicle type"
                required
                value={vehicleTypeId}
                onChange={setVehicleTypeId}
                options={vehicleTypes.map(
                  (type) => [type.id, type.name] as const,
                )}
                disabled={loadingLookups}
              />
              <Field
                label="Plate number"
                required
                value={plate}
                onChange={setPlate}
                placeholder="e.g. 1234 ABC"
              />
              <Field
                label="Vehicle identifier"
                value={vehicleIdentifier}
                onChange={setVehicleIdentifier}
                placeholder="Fleet or bus identifier"
              />
              <Lookup
                label="Vendor"
                value={vendorId}
                onChange={setVendorId}
                options={vendors.map(
                  (vendor) => [vendor.id, vendor.name] as const,
                )}
                disabled={loadingLookups}
              />
              <Field
                label="Driver name"
                value={driverName}
                onChange={setDriverName}
                placeholder="Driver name"
              />
              <Field
                label="Driver phone"
                value={driverPhone}
                onChange={setDriverPhone}
                placeholder="+966 5X XXX XXXX"
              />
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div>
              <h3 className="text-sm font-semibold">Schedule and cost</h3>
              <p className="text-xs text-muted-foreground">
                Timing is optional, but cost is required for confirmed
                transport.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimeRangeField
                departure={departure}
                arrival={arrival}
                onChange={(nextDeparture, nextArrival) => {
                  setDeparture(nextDeparture);
                  setArrival(nextArrival);
                }}
              />
              <div className="rounded-md bg-muted/50 p-3 text-sm sm:col-span-2">
                <span className="text-muted-foreground">
                  Estimated duration:{' '}
                </span>
                {duration ?? 'Add departure and arrival times'}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Transport cost (ETB) <RequiredMark />
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  placeholder="e.g. 12000"
                />
                <p className="text-xs text-muted-foreground">
                  A group finance expense is created automatically.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes / reference</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Booking reference or operational notes"
                  className="min-h-20"
                />
              </div>
            </div>
          </section>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={saving || loadingLookups}
          >
            {saving ? 'Saving…' : segment ? 'Save transport' : 'Add transport'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <RequiredMark />}
      </Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Lookup({
  label,
  required,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <RequiredMark />}
      </Label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next ?? '')}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {options.find(([id]) => id === value)?.[1] ??
              `Select ${label.toLowerCase()}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DateTimeRangeField({
  departure,
  arrival,
  onChange,
}: {
  departure: string;
  arrival: string;
  onChange: (departure: string, arrival: string) => void;
}) {
  const range = {
    from: parseDateTimeInput(departure),
    to: parseDateTimeInput(arrival),
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Departure — Arrival</Label>
      <DateTimeRangePicker
        value={range.from ? range : undefined}
        onChange={(next) =>
          onChange(
            formatDateTimeInput(next?.from),
            formatDateTimeInput(next?.to),
          )
        }
        placeholder="Select departure and arrival"
      />
      <p className="text-xs text-muted-foreground">
        Choose both dates and times in the calendar. Timing is optional.
      </p>
    </div>
  );
}
