import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  type LookupOption,
  type Room,
  type TravelGroupOperationalSummary,
  type TravelGroupTransportSegment,
} from '../../../lib/api.js';
import { DatePicker } from '../../travellers/components/date-picker';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  const minute = index % 2 === 0 ? '00' : '30';
  return `${hour}:${minute}`;
});

export type LogisticsResolutionMode = 'hotel' | 'transport' | 'rooms' | null;

// "hotel" and "rooms" modes are handled by the AccommodationWorkspace
// component. This dialog retains only "transport" for the transport
// resolution flow. The "hotel" and "rooms" modes are kept for backward
// compatibility but are not triggered from the UI.

interface Props {
  group: TravelGroupOperationalSummary;
  mode: LogisticsResolutionMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  segment?: TravelGroupTransportSegment | null;
}

export function GroupLogisticsResolution({
  group,
  mode,
  open,
  onOpenChange,
  onChanged,
  segment,
}: Props) {
  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-transparent p-0 shadow-none">
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
            segment={segment}
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
      <DialogHeader className="flex flex-col items-start gap-2 text-left sm:flex-col sm:items-start sm:gap-2 sm:text-left">
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
  segment,
  onChanged,
  onClose,
}: Omit<Props, 'mode' | 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<LookupOption[]>([]);
  const [vehicleTypeId, setVehicleTypeId] = useState(
    segment?.vehicle_type_id ?? '',
  );
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState(
    segment?.vehicle_plate_number ?? '',
  );
  const [vendorId, setVendorId] = useState(segment?.vendor?.id ?? '');
  const [origin, setOrigin] = useState(segment?.origin_location ?? '');
  const [destination, setDestination] = useState(
    segment?.destination_location ?? '',
  );
  const [departureDatetime, setDepartureDatetime] = useState(
    segment?.departure_datetime?.slice(0, 16) ?? '',
  );
  const [arrivalDatetime, setArrivalDatetime] = useState(
    segment?.arrival_datetime?.slice(0, 16) ?? '',
  );
  const [departureTime, setDepartureTime] = useState(
    segment?.departure_datetime?.slice(11, 16) ?? '',
  );
  const [arrivalTime, setArrivalTime] = useState(
    segment?.arrival_datetime?.slice(11, 16) ?? '',
  );
  const [transportCost, setTransportCost] = useState(
    segment?.transport_cost ? String(segment.transport_cost) : '',
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([logisticsApi.listVendors(1, 100), api.listVehicleTypes()])
      .then(([vendorResult, vehicleTypeResult]) => {
        setVendors(vendorResult.data);
        setVehicleTypes(vehicleTypeResult);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Transport lookups could not be loaded',
        );
      });
  }, []);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const costNum = Number(transportCost);
      if (!vehicleTypeId || !vehiclePlateNumber.trim()) {
        setError('Vehicle type and plate number are required');
        setSaving(false);
        return;
      }
      if (!transportCost.trim() || isNaN(costNum) || costNum <= 0) {
        setError('Transport cost must be a positive amount in ETB');
        setSaving(false);
        return;
      }
      if (
        (departureDatetime && !arrivalDatetime) ||
        (!departureDatetime && arrivalDatetime) ||
        (departureDatetime &&
          arrivalDatetime &&
          arrivalDatetime <= departureDatetime)
      ) {
        setError('Arrival must be after departure when times are provided');
        setSaving(false);
        return;
      }
      const input = {
        origin_location: origin,
        destination_location: destination,
        vehicle_type_id: vehicleTypeId,
        vehicle_plate_number: vehiclePlateNumber.trim().toUpperCase(),
        vendor_id: vendorId || undefined,
        departure_datetime: departureDatetime
          ? new Date(departureDatetime).toISOString()
          : undefined,
        arrival_datetime: arrivalDatetime
          ? new Date(arrivalDatetime).toISOString()
          : undefined,
        transport_cost: costNum,
        notes: notes || undefined,
      };
      if (segment) {
        await api.updateTransportSegment(segment.id, input);
      } else {
        await api.createTransportSegment(group.id, input);
      }
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

  const durationMinutes =
    departureDatetime && arrivalDatetime
      ? Math.round(
          (new Date(arrivalDatetime).getTime() -
            new Date(departureDatetime).getTime()) /
            60000,
        )
      : null;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle>
          {segment ? 'Edit transport segment' : 'Add transport segment'}
        </CardTitle>
        <CardDescription>
          Record a confirmed transport arrangement for {group.name}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-2">
            <Label>Vehicle type</Label>
            <Select
              value={vehicleTypeId}
              onValueChange={(v) => setVehicleTypeId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {vehicleTypes.find((type) => type.id === vehicleTypeId)
                    ?.name ?? 'Select vehicle type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vehicle plate number</Label>
            <Input
              value={vehiclePlateNumber}
              onChange={(event) => setVehiclePlateNumber(event.target.value)}
              placeholder="e.g. 1234 ABC"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated departure</Label>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <DatePicker
                value={departureDatetime.slice(0, 10)}
                onChange={(date) =>
                  setDepartureDatetime(`${date}T${departureTime || '00:00'}`)
                }
                placeholder="Select date"
              />
              <Select
                value={departureTime}
                onValueChange={(time) => {
                  setDepartureTime(time ?? '');
                  if (departureDatetime && time) {
                    setDepartureDatetime(
                      `${departureDatetime.slice(0, 10)}T${time}`,
                    );
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estimated arrival</Label>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <DatePicker
                value={arrivalDatetime.slice(0, 10)}
                onChange={(date) =>
                  setArrivalDatetime(`${date}T${arrivalTime || '00:00'}`)
                }
                placeholder="Select date"
              />
              <Select
                value={arrivalTime}
                onValueChange={(time) => {
                  setArrivalTime(time ?? '');
                  if (arrivalDatetime && time) {
                    setArrivalDatetime(
                      `${arrivalDatetime.slice(0, 10)}T${time}`,
                    );
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="rounded-md bg-muted/50 p-3 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Estimated duration: </span>
            {durationMinutes !== null && durationMinutes > 0
              ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
              : 'Add departure and arrival times'}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Transport cost{' '}
              <span className="text-muted-foreground">(ETB)</span>
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              placeholder="e.g. 12000"
              className="h-9 w-full"
            />
            <p className="text-xs text-muted-foreground">
              A Finance expense will be created automatically for this amount.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes / reference (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booking reference, confirmation details"
              className="min-h-24 w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              saving ||
              !origin ||
              !destination ||
              !vehicleTypeId ||
              !vehiclePlateNumber.trim() ||
              !transportCost.trim()
            }
          >
            {saving
              ? 'Saving…'
              : segment
                ? 'Save transport segment'
                : 'Add transport segment'}
          </Button>
        </DialogFooter>
      </CardContent>
    </Card>
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
