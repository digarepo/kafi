import { useEffect, useMemo, useState } from 'react';
import {
  Button,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@kafi/ui';
import {
  logisticsApi,
  type Hotel,
  type Vendor,
} from '../../../lib/logistics-api';
import {
  api,
  type Room,
  type TravelGroupOperationalSummary,
} from '../../../lib/api.js';

export type LogisticsResolutionMode = 'hotel' | 'transport' | 'rooms' | null;

// Note: "hotel" and "rooms" modes are now handled by the AccommodationWorkspace
// component. This dialog retains only "transport" for the transport resolution
// flow. The "hotel" and "rooms" modes are kept for backward compatibility but
// should not be triggered from the UI.

interface Props {
  group: TravelGroupOperationalSummary;
  mode: LogisticsResolutionMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function GroupLogisticsResolution({
  group,
  mode,
  open,
  onOpenChange,
  onChanged,
}: Props) {
  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {mode === 'hotel' && (
          <HotelResolution
            group={group}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        )}
        {mode === 'transport' && (
          <TransportResolution
            group={group}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        )}
        {mode === 'rooms' && (
          <RoomResolution
            group={group}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HotelResolution({
  group,
  onChanged,
  onClose,
}: Omit<Props, 'mode' | 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [statuses, setStatuses] = useState<
    { id: string; code?: string; name: string }[]
  >([]);
  const [hotelId, setHotelId] = useState('');
  const [cityId, setCityId] = useState('');
  const [checkIn, setCheckIn] = useState(group.departure_date ?? '');
  const [checkOut, setCheckOut] = useState(group.return_date ?? '');
  const [statusId, setStatusId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      logisticsApi.listHotels(1, 100),
      api.listLogisticsCities(),
      api.listGroupHotelStayStatuses(),
    ])
      .then(([hotelResult, cityResult, statusResult]) => {
        if (!active) return;
        setHotels(hotelResult.data);
        setCities(cityResult);
        setStatuses(statusResult);
        setStatusId(
          statusResult.find((status) => status.code === 'CONFIRMED')?.id ?? '',
        );
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Hotel lookups could not be loaded',
        ),
      );
    return () => {
      active = false;
    };
  }, []);

  const pendingStay = group.logistics.hotel_stays.find(
    (stay) => stay.status?.code !== 'CONFIRMED',
  );

  async function confirmExisting() {
    if (!pendingStay) return;
    setSaving(true);
    setError(null);
    try {
      // Stays are now created as CONFIRMED; kept for backward compat
      await api.updateGroupHotelStay(pendingStay.id, {});
      onChanged();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Hotel stay could not be confirmed',
      );
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.createGroupHotelStay(group.id, {
        hotel_name: hotelId ? undefined : 'Hotel',
        city_id: cityId,
        check_in_date: checkIn,
        check_out_date: checkOut,
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Hotel stay could not be saved',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add hotel stay</DialogTitle>
        <DialogDescription>
          Configure accommodation for {group.name}.
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {pendingStay && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">
            Existing stay: {pendingStay.hotel?.name ?? pendingStay.stay_number}
          </p>
          <p className="text-muted-foreground">
            Current status: {pendingStay.status?.name ?? 'Unknown'}
          </p>
          <Button
            className="mt-2"
            size="sm"
            onClick={() => void confirmExisting()}
            disabled={saving || !statusId}
          >
            Confirm existing stay
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Lookup
          label="Hotel"
          value={hotelId}
          onChange={setHotelId}
          options={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))}
        />
        <Lookup
          label="City"
          value={cityId}
          onChange={setCityId}
          options={cities}
        />
        <Field
          label="Check-in"
          type="date"
          value={checkIn}
          onChange={setCheckIn}
        />
        <Field
          label="Check-out"
          type="date"
          value={checkOut}
          onChange={setCheckOut}
        />
        <Lookup
          label="Status"
          value={statusId}
          onChange={setStatusId}
          options={statuses}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={saving || !hotelId || !cityId || !checkIn || !checkOut}
        >
          {saving ? 'Saving…' : 'Add hotel stay'}
        </Button>
      </DialogFooter>
    </>
  );
}

function TransportResolution({
  group,
  onChanged,
  onClose,
}: Omit<Props, 'mode' | 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logisticsApi
      .listVendors(1, 100)
      .then((result) => setVendors(result.data))
      .catch(() => {
        // Vendor lookup is optional — transport can be recorded without a vendor
      });
  }, []);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const costNum = Number(transportCost);
      if (!transportCost.trim() || isNaN(costNum) || costNum <= 0) {
        setError('Transport cost must be a positive amount in ETB');
        setSaving(false);
        return;
      }
      await api.createTransportSegment(group.id, {
        origin_location: origin,
        destination_location: destination,
        vendor_id: vendorId || undefined,
        transport_cost: costNum,
        notes: notes || undefined,
      });
      onChanged();
      onClose();
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
    <>
      <DialogHeader>
        <DialogTitle>Confirm transport</DialogTitle>
        <DialogDescription>
          Record a confirmed transport arrangement for {group.name}.
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Origin</Label>
          <Input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="e.g. Jeddah Airport"
          />
        </div>
        <div className="space-y-2">
          <Label>Destination</Label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Hilton Makkah"
          />
        </div>
        {vendors.length > 0 && (
          <div className="space-y-2">
            <Label>Vendor (optional)</Label>
            <Select
              value={vendorId}
              onValueChange={(v) => setVendorId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {vendors.find((v) => v.id === vendorId)?.name ??
                    'Select vendor'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>
            Transport cost <span className="text-muted-foreground">(ETB)</span>
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={transportCost}
            onChange={(e) => setTransportCost(e.target.value)}
            placeholder="e.g. 12000"
            className="h-9 w-full sm:max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            A Finance expense will be created automatically for this amount.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Notes / reference (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Booking ref, confirmation details"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={saving || !origin || !destination || !transportCost.trim()}
        >
          {saving ? 'Saving…' : 'Confirm transport'}
        </Button>
      </DialogFooter>
    </>
  );
}

function RoomResolution({
  group,
  onChanged,
  onClose,
}: Omit<Props, 'mode' | 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stayId, setStayId] = useState(
    group.logistics.hotel_stays[0]?.id ?? '',
  );
  const [roomId, setRoomId] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unassigned = useMemo(
    () =>
      group.members.filter(
        (member) => member.status_code === 'ACTIVE' && !member.room,
      ),
    [group.members],
  );

  useEffect(() => {
    if (!stayId) return;
    api
      .listRooms(stayId)
      .then(setRooms)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Rooms could not be loaded',
        ),
      );
  }, [stayId]);

  async function createRoom() {
    setSaving(true);
    try {
      await api.createRoom(stayId, {
        room_number: roomNumber,
        capacity: Number(capacity),
      });
      setRoomNumber('');
      setRooms(await api.listRooms(stayId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Room could not be created',
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignRoom() {
    setSaving(true);
    try {
      await api.createRoomAssignment({
        room_id: roomId,
        group_hotel_stay_id: stayId,
        group_membership_id: membershipId,
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Room assignment could not be created',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage rooms</DialogTitle>
        <DialogDescription>
          Create rooms and assign active members for {group.name}.
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Lookup
        label="Hotel stay"
        value={stayId}
        onChange={setStayId}
        options={group.logistics.hotel_stays.map((stay) => ({
          id: stay.id,
          name: stay.hotel?.name ?? stay.stay_number,
        }))}
      />
      <Tabs defaultValue="assign" className="pt-2">
        <TabsList>
          <TabsTrigger value="assign">Assign member</TabsTrigger>
          <TabsTrigger value="create">Create room</TabsTrigger>
        </TabsList>
        <TabsContent value="assign" className="space-y-3 pt-3">
          <Lookup
            label="Unassigned member"
            value={membershipId}
            onChange={setMembershipId}
            options={unassigned.map((member) => ({
              id: member.id,
              name: member.traveller
                ? `${member.traveller.first_name} ${member.traveller.last_name}`.trim()
                : (member.registration_number ?? member.id),
            }))}
          />
          <Lookup
            label="Available room"
            value={roomId}
            onChange={setRoomId}
            options={rooms
              .filter((room) => room.room_status?.status_code === 'AVAILABLE')
              .map((room) => ({
                id: room.id,
                name: `${room.room_number} · capacity ${room.capacity}`,
              }))}
          />
          <Button
            onClick={() => void assignRoom()}
            disabled={saving || !membershipId || !roomId}
          >
            Assign room
          </Button>
        </TabsContent>
        <TabsContent value="create" className="space-y-3 pt-3">
          <Field
            label="Room number"
            value={roomNumber}
            onChange={setRoomNumber}
          />
          <Field
            label="Capacity"
            type="number"
            value={capacity}
            onChange={setCapacity}
          />
          <Button
            onClick={() => void createRoom()}
            disabled={saving || !stayId || !roomNumber || Number(capacity) < 1}
          >
            Create room
          </Button>
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}

function Lookup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
