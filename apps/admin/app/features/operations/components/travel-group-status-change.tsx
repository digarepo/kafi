import { useEffect, useState } from 'react';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import {
  api,
  type TravelGroup,
  type TravelGroupStatus,
} from '../../../lib/api.js';

interface TravelGroupStatusChangeProps {
  group: TravelGroup;
  onChanged: () => void;
}

export function TravelGroupStatusChange({
  group,
  onChanged,
}: TravelGroupStatusChangeProps) {
  const { can } = usePermissions();
  const [statuses, setStatuses] = useState<TravelGroupStatus[]>([]);
  const [selected, setSelected] = useState(group.status?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.listTravelGroupStatuses();
        if (!cancelled) setStatuses(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load statuses',
          );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelected(group.status?.id ?? '');
  }, [group.status?.id]);

  async function handleSubmit() {
    if (!selected || selected === group.status?.id) return;
    setLoading(true);
    setError(null);
    try {
      await api.changeTravelGroupStatus(group.id, {
        travel_group_status_id: selected,
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status change failed');
    } finally {
      setLoading(false);
    }
  }

  if (!can('TRAVEL_GROUP_MANAGE')) return null;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label className="text-sm font-medium">Status</Label>
      <div className="flex items-center gap-3">
        <Select
          value={selected}
          onValueChange={(value) => setSelected(value ?? '')}
        >
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!selected || selected === group.status?.id || loading}
        >
          {loading ? 'Changing…' : 'Change status'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
