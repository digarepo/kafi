import type { DateRange } from 'react-day-picker';
import type {
  GroupMembership,
  PackageVersion,
  TravelGroup,
} from '../../../lib/api.js';

export type TravelGroupFormMode = 'create' | 'edit';

export interface TravelGroupFormValues {
  package_version_id: string;
  name: string;
  travelRange?: DateRange;
  override_travel_dates: boolean;
  maximum_capacity: number;
  remarks: string;
}

export interface TravelGroupFormOutput {
  package_version_id: string;
  name: string;
  maximum_capacity: number;
  departure_date?: string;
  return_date?: string;
  remarks?: string;
}

export interface TravelGroupFormProps {
  mode: TravelGroupFormMode;
  group?: TravelGroup | null;
  packageVersions: PackageVersion[];
  onSubmit: (values: TravelGroupFormOutput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export interface TravelGroupDetailCardProps {
  group: TravelGroup;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface TravelGroupMembersTableProps {
  members: TravelGroup['members'];
  onView: (m: GroupMembership) => void;
  onDelete: (m: GroupMembership) => void;
}
