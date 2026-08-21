import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Hotel as HotelIcon,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';
import { type DateRange } from 'react-day-picker';
import { DateRangePicker } from '../../packages/components/date-range-picker';
import {
  api,
  type Country,
  type CreateGroupHotelStayInput,
  type CreateRoomInput,
  type Room,
  type StayCoverage,
  type TravelGroupHotelStay,
  type TravelGroupOperationalSummary,
} from '../../../lib/api.js';
import { displayDate, toYmd } from '../lib/date';

interface Props {
  group: TravelGroupOperationalSummary;
  onChanged: () => void;
}

export function AccommodationWorkspace({ group, onChanged }: Props) {
  const [addStayOpen, setAddStayOpen] = useState(false);
  const [expandedStays, setExpandedStays] = useState<Set<string>>(new Set());
  const [coverage, setCoverage] = useState<StayCoverage[]>(
    group.logistics.stay_coverage ?? [],
  );

  useEffect(() => {
    setCoverage(group.logistics.stay_coverage ?? []);
  }, [group.logistics.stay_coverage]);

  const toggleStay = useCallback((stayId: string) => {
    setExpandedStays((prev) => {
      const next = new Set(prev);
      if (next.has(stayId)) {
        next.delete(stayId);
      } else {
        next.add(stayId);
      }
      return next;
    });
  }, []);

  const refreshCoverage = useCallback(async () => {
    try {
      const result = await api.getAccommodationCoverage(group.id);
      setCoverage(result.stays);
    } catch {
      // coverage will refresh on next parent reload
    }
  }, [group.id]);

  const stays = group.logistics.hotel_stays;
  const confirmedStays = stays.filter((s) => s.status?.code === 'CONFIRMED');
  const accommodationReady = group.logistics.accommodation_ready ?? false;

  // Derive the shared booking reference from existing stays
  const existingBookingRef =
    stays.find((s) => s.booking_reference)?.booking_reference ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Accommodation</h3>
          <p className="text-sm text-muted-foreground">
            {confirmedStays.length} confirmed stay
            {confirmedStays.length === 1 ? '' : 's'}
            {coverage.length > 0 && (
              <>
                {' · Travelers accommodated: '}
                {coverage[0]?.assigned_count ?? 0} /{' '}
                {coverage[0]?.active_member_count ?? 0}
              </>
            )}
            {accommodationReady
              ? ' · All travelers have rooms'
              : coverage.some((c) => !c.complete)
                ? ' · Some travelers missing rooms'
                : ''}
          </p>
        </div>
        <Button
          onClick={() => setAddStayOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Hotel Stay
        </Button>
      </div>

      {stays.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <HotelIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No hotel stays configured</p>
            <p className="text-sm text-muted-foreground">
              Add a confirmed hotel stay to begin accommodation planning.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {stays.map((stay, index) => {
            const stayCoverage = coverage.find((c) => c.stay_id === stay.id);
            const isExpanded = expandedStays.has(stay.id);
            return (
              <StayCard
                key={stay.id}
                stay={stay}
                index={index + 1}
                coverage={stayCoverage}
                isExpanded={isExpanded}
                onToggle={() => toggleStay(stay.id)}
                group={group}
                onChanged={() => {
                  void onChanged();
                  void refreshCoverage();
                }}
              />
            );
          })}
        </div>
      )}

      <AddHotelStayDialog
        groupId={group.id}
        groupNumber={group.group_number}
        existingBookingRef={existingBookingRef}
        existingStays={stays}
        open={addStayOpen}
        onOpenChange={setAddStayOpen}
        onCreated={() => {
          setAddStayOpen(false);
          void onChanged();
          void refreshCoverage();
        }}
        departureDate={group.departure_date}
        returnDate={group.return_date}
      />
    </div>
  );
}

// ---- Stay Card ----

interface StayCardProps {
  stay: TravelGroupHotelStay;
  index: number;
  coverage?: StayCoverage;
  isExpanded: boolean;
  onToggle: () => void;
  group: TravelGroupOperationalSummary;
  onChanged: () => void;
}

function StayCard({
  stay,
  index,
  coverage,
  isExpanded,
  onToggle,
  group,
  onChanged,
}: StayCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const hotelName = stay.hotel_name ?? stay.hotel?.name ?? 'Hotel unavailable';
  const cityName = stay.city?.name ?? 'City unavailable';
  const isComplete = coverage?.complete ?? false;
  const missingCount = coverage?.missing_count ?? 0;
  const assignedCount = coverage?.assigned_count ?? 0;
  const activeCount = coverage?.active_member_count ?? 0;

  async function handleDeleteStay() {
    if (
      !confirm(
        'Delete this hotel stay? Rooms and assignments must be removed first.',
      )
    )
      return;
    try {
      await api.deleteGroupHotelStay(stay.id);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete stay');
    }
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{cityName}</span>
                <span className="text-sm text-muted-foreground">
                  {displayDate(stay.check_in_date)} →{' '}
                  {displayDate(stay.check_out_date)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {hotelName}
                {stay.booking_reference
                  ? ` · Ref: ${stay.booking_reference}`
                  : ''}
              </p>
              {coverage && (
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={
                      isComplete
                        ? 'text-success font-medium'
                        : 'text-warning font-medium'
                    }
                  >
                    Travelers: {assignedCount}/{activeCount}
                  </span>
                  {missingCount > 0 && (
                    <span className="text-warning">
                      {missingCount} need rooms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComplete ? (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                ✓ Ready
              </span>
            ) : coverage ? (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                ⚠ {missingCount} need rooms
              </span>
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen(true);
              }}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Edit stay"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleDeleteStay();
              }}
              className="text-muted-foreground hover:text-destructive p-1"
              aria-label="Delete stay"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="border-t pt-4">
          <StayRoomManager stay={stay} group={group} onChanged={onChanged} />
        </CardContent>
      )}
      <EditHotelStayDialog
        stay={stay}
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => {
          setEditOpen(false);
          onChanged();
        }}
      />
    </Card>
  );
}

// ---- Stay Room Manager ----

interface StayRoomManagerProps {
  stay: TravelGroupHotelStay;
  group: TravelGroupOperationalSummary;
  onChanged: () => void;
}

function StayRoomManager({ stay, group, onChanged }: StayRoomManagerProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [reassignFor, setReassignFor] = useState<{
    assignmentId: string;
    memberName: string;
  } | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const result = await api.listRooms(stay.id);
      setRooms(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Rooms could not be loaded',
      );
    } finally {
      setLoading(false);
    }
  }, [stay.id]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  // Get active assignments for this stay from the group summary
  const stayAssignments = group.logistics.room_assignments.filter(
    (a) => a.group_hotel_stay?.id === stay.id,
  );

  // Map room_id -> assignments
  const assignmentsByRoom = useMemo(() => {
    const map = new Map<string, typeof stayAssignments>();
    for (const room of rooms) {
      map.set(
        room.id,
        stayAssignments.filter((a) =>
          rooms.find(
            (r) => r.id === room.id && r.room_number === a.room_number,
          ),
        ),
      );
    }
    return map;
  }, [rooms, stayAssignments]);

  async function handleAutoAssign() {
    setAutoAssignLoading(true);
    setError(null);
    try {
      await api.autoAssignRoomsForStay(stay.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-assign failed');
    } finally {
      setAutoAssignLoading(false);
    }
  }

  async function handleRelease(assignmentId: string) {
    if (!confirm('Release this room assignment?')) return;
    try {
      await api.releaseRoomAssignment(assignmentId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed');
    }
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Delete this room?')) return;
    try {
      await api.deleteRoom(roomId);
      await loadRooms();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room deletion failed');
    }
  }

  async function handleReassign(assignmentId: string, newRoomId: string) {
    try {
      await api.reassignRoomAssignment(assignmentId, newRoomId);
      setReassignFor(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reassignment failed');
    }
  }

  if (loading)
    return <p className="text-sm text-muted-foreground">Loading rooms…</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setCreateRoomOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Room
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void handleAutoAssign()}
          disabled={autoAssignLoading}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {autoAssignLoading ? 'Assigning…' : 'Auto-assign'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Manual assign
        </Button>
      </div>

      {rooms.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No rooms created for this stay yet.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const roomAssignments = assignmentsByRoom.get(room.id) ?? [];
            const remainingCapacity = room.capacity - roomAssignments.length;
            return (
              <div
                key={room.id}
                className="rounded-md border p-3 text-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Room {room.room_number}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditRoom(room)}
                      className="text-muted-foreground hover:text-foreground p-1"
                      aria-label="Edit room"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void handleDeleteRoom(room.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Delete room"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Capacity: {room.capacity}
                  {room.room_type ? ` · ${room.room_type.name}` : ''}
                  {room.gender_restriction
                    ? ` · ${room.gender_restriction} only`
                    : ''}
                  {remainingCapacity > 0 &&
                    ` · ${remainingCapacity} bed${remainingCapacity === 1 ? '' : 's'} free`}
                </p>
                <div className="space-y-1">
                  {roomAssignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No assignments
                    </p>
                  ) : (
                    roomAssignments.map((a) => {
                      const member = group.members.find(
                        (m) => m.id === a.group_membership_id,
                      );
                      const name = member?.traveller
                        ? `${member.traveller.first_name} ${member.traveller.last_name}`.trim()
                        : 'Unknown member';
                      return (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-xs"
                        >
                          <span>{name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setReassignFor({
                                  assignmentId: a.id,
                                  memberName: name,
                                })
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => void handleRelease(a.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              Release
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateRoomDialog
        stayId={stay.id}
        open={createRoomOpen}
        onOpenChange={setCreateRoomOpen}
        onCreated={() => {
          setCreateRoomOpen(false);
          void loadRooms();
        }}
      />

      <ManualAssignDialog
        stay={stay}
        group={group}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          setAssignOpen(false);
          onChanged();
        }}
        rooms={rooms}
      />

      {editRoom && (
        <EditRoomDialog
          room={editRoom}
          open={!!editRoom}
          onOpenChange={(o) => !o && setEditRoom(null)}
          onSaved={() => {
            setEditRoom(null);
            void loadRooms();
            onChanged();
          }}
        />
      )}

      {reassignFor && (
        <ReassignDialog
          stay={stay}
          rooms={rooms}
          memberName={reassignFor.memberName}
          open={!!reassignFor}
          onOpenChange={(o) => !o && setReassignFor(null)}
          onReassign={(roomId) =>
            void handleReassign(reassignFor.assignmentId, roomId)
          }
        />
      )}
    </div>
  );
}

// ---- Add Hotel Stay Dialog ----

interface AddHotelStayDialogProps {
  groupId: string;
  groupNumber: string;
  existingBookingRef: string | null;
  existingStays: TravelGroupHotelStay[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  departureDate?: string | null;
  returnDate?: string | null;
}

interface RoomEntry {
  roomNumber: string;
  capacity: string;
}

function AddHotelStayDialog({
  groupId,
  groupNumber,
  existingBookingRef,
  existingStays,
  open,
  onOpenChange,
  onCreated,
  departureDate,
  returnDate,
}: AddHotelStayDialogProps) {
  return (
    <HotelStayFormDialog
      mode="create"
      groupId={groupId}
      groupNumber={groupNumber}
      existingBookingRef={existingBookingRef}
      existingStays={existingStays}
      open={open}
      onOpenChange={onOpenChange}
      onSaved={onCreated}
      departureDate={departureDate}
      returnDate={returnDate}
    />
  );
}

// ---- Edit Hotel Stay Dialog ----

interface EditHotelStayDialogProps {
  stay: TravelGroupHotelStay;
  group: TravelGroupOperationalSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function EditHotelStayDialog({
  stay,
  group,
  open,
  onOpenChange,
  onSaved,
}: EditHotelStayDialogProps) {
  const allStays = group.logistics.hotel_stays;
  return (
    <HotelStayFormDialog
      mode="edit"
      stay={stay}
      groupId={group.id}
      groupNumber={group.group_number}
      existingBookingRef={
        allStays.find((s) => s.booking_reference)?.booking_reference ?? null
      }
      existingStays={allStays.filter((s) => s.id !== stay.id)}
      open={open}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      departureDate={group.departure_date}
      returnDate={group.return_date}
    />
  );
}

// ---- Reusable Hotel Stay Form Dialog ----

interface HotelStayFormDialogProps {
  mode: 'create' | 'edit';
  groupId: string;
  groupNumber: string;
  existingBookingRef: string | null;
  existingStays: TravelGroupHotelStay[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  departureDate?: string | null;
  returnDate?: string | null;
  stay?: TravelGroupHotelStay;
}

function HotelStayFormDialog({
  mode,
  groupId,
  groupNumber,
  existingBookingRef,
  existingStays,
  open,
  onOpenChange,
  onSaved,
  departureDate,
  returnDate,
  stay,
}: HotelStayFormDialogProps) {
  const isEdit = mode === 'edit';
  const autoBookingRef = existingBookingRef ?? `BK-${groupNumber}`;
  const [bookingRef, setBookingRef] = useState(autoBookingRef);
  const [countryId, setCountryId] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [hotelName, setHotelName] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [accommodationCost, setAccommodationCost] = useState('');
  const [roomEntries, setRoomEntries] = useState<RoomEntry[]>([
    { roomNumber: '', capacity: '2' },
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load countries and default to Saudi Arabia
  useEffect(() => {
    if (!open) return;
    api
      .listCountries()
      .then((result) => {
        setCountries(result);
        const saudi = result.find((c) => c.iso_code === 'SA');
        if (saudi) setCountryId(saudi.id);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Countries could not be loaded',
        ),
      );
  }, [open]);

  // Load cities filtered by selected country
  useEffect(() => {
    if (!open || !countryId) return;
    if (!isEdit) setCityId('');
    api
      .listLogisticsCities(countryId)
      .then((result) => {
        setCities(result);
        if (isEdit && stay?.city) {
          const found = result.find((c) => c.id === stay.city?.id);
          if (found) setCityId(found.id);
        }
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Cities could not be loaded',
        ),
      );
  }, [open, countryId, isEdit, stay]);

  // Initialize form fields when dialog opens
  useEffect(() => {
    if (!open) return;
    if (isEdit && stay) {
      setHotelName(stay.hotel_name ?? '');
      setBookingRef(stay.booking_reference ?? autoBookingRef);
      setNotes(stay.notes ?? '');
      setDateRange({
        from: new Date(stay.check_in_date),
        to: new Date(stay.check_out_date),
      });
      setAccommodationCost(
        stay.accommodation_cost != null ? String(stay.accommodation_cost) : '',
      );
      setRoomEntries([{ roomNumber: '', capacity: '2' }]);
    } else {
      setHotelName('');
      setBookingRef(autoBookingRef);
      setNotes('');
      setDateRange(undefined);
      setAccommodationCost('');
      setRoomEntries([{ roomNumber: '', capacity: '2' }]);
    }
    setError(null);
  }, [open, isEdit, stay, autoBookingRef]);

  // Compute the earliest available check-in date.
  const minDate = useMemo(() => {
    const departure = departureDate ? new Date(departureDate) : null;
    // For edit mode, the min date is just the travel group departure date.
    // The disabled ranges (other stays) prevent overlaps, and the backend
    // enforces chronological ordering.
    if (isEdit) {
      return departure ?? undefined;
    }
    // For create mode, the new stay must come after all existing stays.
    const latestCheckout = existingStays
      .map((s) => new Date(s.check_out_date))
      .reduce((max, d) => (d > max ? d : max), new Date(0));
    if (existingStays.length > 0 && latestCheckout > new Date(0)) {
      return latestCheckout;
    }
    return departure ?? undefined;
  }, [departureDate, existingStays, isEdit]);

  const maxDate = returnDate ? new Date(returnDate) : undefined;

  // Build a list of date ranges occupied by other existing stays.
  // The check-out day is NOT disabled because the next stay can start
  // on the same day the previous stay checks out (same-day transition).
  const existingRanges = useMemo(
    () =>
      existingStays.map((s) => {
        const from = new Date(s.check_in_date);
        const to = new Date(s.check_out_date);
        to.setDate(to.getDate() - 1);
        return { from, to };
      }),
    [existingStays],
  );

  function addRoomEntry() {
    setRoomEntries((prev) => [...prev, { roomNumber: '', capacity: '2' }]);
  }

  function removeRoomEntry(index: number) {
    setRoomEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRoomEntry(
    index: number,
    field: keyof RoomEntry,
    value: string,
  ) {
    setRoomEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const checkIn = dateRange?.from ? toYmd(dateRange.from) : '';
      const checkOut = dateRange?.to ? toYmd(dateRange.to) : '';

      if (!checkIn || !checkOut) {
        setError('Please select a check-in and check-out date range');
        setSaving(false);
        return;
      }

      const costNum = Number(accommodationCost);
      if (!accommodationCost.trim() || isNaN(costNum) || costNum <= 0) {
        setError('Accommodation cost must be a positive amount in ETB');
        setSaving(false);
        return;
      }

      const input: CreateGroupHotelStayInput = {
        hotel_name: hotelName,
        city_id: cityId,
        check_in_date: checkIn,
        check_out_date: checkOut,
        booking_reference: bookingRef || undefined,
        accommodation_cost: costNum,
        notes: notes || undefined,
      };

      if (isEdit && stay) {
        await api.updateGroupHotelStay(stay.id, input);
        const validRooms = roomEntries.filter(
          (r) => r.roomNumber.trim() && Number(r.capacity) >= 1,
        );
        for (const room of validRooms) {
          const roomInput: CreateRoomInput = {
            room_number: room.roomNumber.trim(),
            capacity: Number(room.capacity),
          };
          try {
            await api.createRoom(stay.id, roomInput);
          } catch {
            // Continue creating remaining rooms even if one fails
          }
        }
      } else {
        const createdStay = await api.createGroupHotelStay(groupId, input);
        const validRooms = roomEntries.filter(
          (r) => r.roomNumber.trim() && Number(r.capacity) >= 1,
        );
        for (const room of validRooms) {
          const roomInput: CreateRoomInput = {
            room_number: room.roomNumber.trim(),
            capacity: Number(room.capacity),
          };
          try {
            await api.createRoom(createdStay.id, roomInput);
          } catch {
            // Continue creating remaining rooms even if one fails
          }
        }
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Hotel stay could not be saved',
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCity = cities.find((c) => c.id === cityId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Hotel Stay' : 'Add Hotel Stay'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update hotel stay details for this travel group.'
              : 'Record a confirmed hotel stay for this travel group. The booking reference stays the same across all stays for this group.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-4">
          {/* 1. Booking Reference */}
          <div className="space-y-2">
            <Label>Booking Reference</Label>
            <Input
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder={`BK-${groupNumber}`}
            />
            <p className="text-xs text-muted-foreground">
              Shared across all stays for this travel group.
            </p>
          </div>

          {/* 2. Country */}
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={countryId}
              onValueChange={(v) => setCountryId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {countries.find((c) => c.id === countryId)?.name ??
                    'Select country'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. City */}
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={cityId} onValueChange={(v) => setCityId(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{selectedCity?.name ?? 'Select city'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Hotel Name */}
          <div className="space-y-2">
            <Label>Hotel Name</Label>
            <Input
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="e.g. Hilton Makkah"
            />
          </div>

          {/* 5. Check-in / Check-out Date Range */}
          <div className="space-y-2">
            <Label>Check-in — Check-out</Label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
              disabledRanges={existingRanges}
              placeholder="Select stay date range"
            />
            {minDate && maxDate && (
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? `Stay must be within ${displayDate(departureDate)} — ${displayDate(returnDate)}. Dates overlapping other stays are disabled.`
                  : existingStays.length > 0
                    ? `Available from ${displayDate(toYmd(minDate))} to ${displayDate(returnDate)}`
                    : `Stay must be within ${displayDate(departureDate)} — ${displayDate(returnDate)}`}
              </p>
            )}
          </div>

          {/* 6. Accommodation Cost */}
          <div className="space-y-2">
            <Label>
              Accommodation cost{' '}
              <span className="text-muted-foreground">(ETB)</span>
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={accommodationCost}
              onChange={(e) => setAccommodationCost(e.target.value)}
              placeholder="e.g. 50000"
              className="h-9 w-full sm:max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              A Finance expense will be created automatically for this amount.
            </p>
          </div>

          {/* 7. Rooms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{isEdit ? 'Add rooms (optional)' : 'Rooms'}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRoomEntry}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add room
              </Button>
            </div>
            <div className="space-y-2">
              {roomEntries.map((entry, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    placeholder="Room #"
                    value={entry.roomNumber}
                    onChange={(e) =>
                      updateRoomEntry(index, 'roomNumber', e.target.value)
                    }
                  />
                  <Input
                    className="w-20 shrink-0"
                    type="number"
                    min={1}
                    placeholder="Cap"
                    value={entry.capacity}
                    onChange={(e) =>
                      updateRoomEntry(index, 'capacity', e.target.value)
                    }
                  />
                  {roomEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoomEntry(index)}
                      className="shrink-0 text-muted-foreground hover:text-destructive p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 7. Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
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
            disabled={
              saving ||
              !hotelName ||
              !cityId ||
              !dateRange?.from ||
              !dateRange?.to ||
              !accommodationCost.trim()
            }
          >
            {saving
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Add confirmed stay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ---- Create Room Dialog ----

interface CreateRoomDialogProps {
  stayId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateRoomDialog({
  stayId,
  open,
  onOpenChange,
  onCreated,
}: CreateRoomDialogProps) {
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [notes, setNotes] = useState('');
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api
      .listRoomTypes()
      .then(setRoomTypes)
      .catch(() => {
        // room types are optional
      });
  }, [open]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const input: CreateRoomInput = {
        room_number: roomNumber,
        capacity: Number(capacity),
        room_type_id: roomTypeId || undefined,
        notes: notes || undefined,
      };
      await api.createRoom(stayId, input);
      setRoomNumber('');
      setCapacity('2');
      setRoomTypeId('');
      setNotes('');
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Room could not be created',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Room</DialogTitle>
          <DialogDescription>
            Create a room for this hotel stay.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Room Number</Label>
            <Input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 101"
            />
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          {roomTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Room Type (optional)</Label>
              <Select
                value={roomTypeId}
                onValueChange={(v) => setRoomTypeId(v ?? '')}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue>
                    {roomTypes.find((rt) => rt.id === roomTypeId)?.name ??
                      'Select room type'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
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
            disabled={saving || !roomNumber || Number(capacity) < 1}
          >
            {saving ? 'Saving…' : 'Add room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Edit Room Dialog ----

interface EditRoomDialogProps {
  room: Room;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function EditRoomDialog({
  room,
  open,
  onOpenChange,
  onSaved,
}: EditRoomDialogProps) {
  const [roomNumber, setRoomNumber] = useState(room.room_number);
  const [capacity, setCapacity] = useState(String(room.capacity));
  const [notes, setNotes] = useState(room.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRoomNumber(room.room_number);
      setCapacity(String(room.capacity));
      setNotes(room.notes ?? '');
      setError(null);
    }
  }, [open, room]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.updateRoom(room.id, {
        room_number: roomNumber,
        capacity: Number(capacity),
        notes: notes || undefined,
      } as any);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save room');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>
            Update room number, capacity, or notes.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Room Number</Label>
            <Input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
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
            disabled={saving || !roomNumber || Number(capacity) < 1}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Reassign Dialog ----

interface ReassignDialogProps {
  stay: TravelGroupHotelStay;
  rooms: Room[];
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassign: (roomId: string) => void;
}

function ReassignDialog({
  stay,
  rooms,
  memberName,
  open,
  onOpenChange,
  onReassign,
}: ReassignDialogProps) {
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRoomId('');
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (!roomId) return;
    setSaving(true);
    setError(null);
    try {
      onReassign(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reassignment failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move {memberName}</DialogTitle>
          <DialogDescription>
            Select a new room in {stay.city?.name ?? 'this stay'}. The old
            assignment will be released automatically.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>New room</Label>
            <Select value={roomId} onValueChange={(v) => setRoomId(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(() => {
                    const r = rooms.find((r) => r.id === roomId);
                    return r
                      ? `Room ${r.room_number} · capacity ${r.capacity}`
                      : 'Select room';
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.room_number} · capacity {r.capacity}
                    {r.gender_restriction
                      ? ` · ${r.gender_restriction} only`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !roomId}>
            {saving ? 'Moving…' : 'Move to room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Manual Assign Dialog ----

interface ManualAssignDialogProps {
  stay: TravelGroupHotelStay;
  group: TravelGroupOperationalSummary;
  rooms: Room[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

function ManualAssignDialog({
  stay,
  group,
  rooms,
  open,
  onOpenChange,
  onAssigned,
}: ManualAssignDialogProps) {
  const [membershipId, setMembershipId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active members not yet assigned in this stay
  const stayAssignmentMemberIds = new Set(
    group.logistics.room_assignments
      .filter(
        (a) =>
          a.group_hotel_stay?.id === stay.id && a.status?.code === 'ASSIGNED',
      )
      .map((a) => a.group_membership_id),
  );

  const unassigned = group.members.filter(
    (m) => m.status_code === 'ACTIVE' && !stayAssignmentMemberIds.has(m.id),
  );

  const availableRooms = rooms.filter(
    (r) => r.room_status?.status_code === 'AVAILABLE',
  );

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.createRoomAssignment({
        room_id: roomId,
        group_hotel_stay_id: stay.id,
        group_membership_id: membershipId,
      });
      setMembershipId('');
      setRoomId('');
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Room Assignment</DialogTitle>
          <DialogDescription>
            Assign a member to a room in {stay.city?.name ?? 'this stay'}.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Unassigned member</Label>
            <Select
              value={membershipId}
              onValueChange={(v) => setMembershipId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select member">
                  {(() => {
                    const m = group.members.find((m) => m.id === membershipId);
                    if (!m) return 'Select member';
                    return m.traveller
                      ? `${m.traveller.first_name} ${m.traveller.last_name}`.trim()
                      : (m.registration_number ?? m.id);
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {unassigned.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.traveller
                      ? `${m.traveller.first_name} ${m.traveller.last_name}`.trim()
                      : (m.registration_number ?? m.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Available room</Label>
            <Select value={roomId} onValueChange={(v) => setRoomId(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(() => {
                    const r = rooms.find((r) => r.id === roomId);
                    return r
                      ? `Room ${r.room_number} · capacity ${r.capacity}`
                      : 'Select room';
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableRooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.room_number} · capacity {r.capacity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            disabled={saving || !membershipId || !roomId}
          >
            {saving ? 'Assigning…' : 'Assign room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
