import type { User } from '../../../lib/api.js';

export interface UserFormValues {
  employee_number?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  job_title: string;
  gender: 'Male' | 'Female';
  role_id: string;
  user_status_id?: string;
}

export interface UserFormOutput {
  employee_number?: string;
  full_name?: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  job_title: string;
  gender: 'Male' | 'Female';
  role_ids: string[];
  user_status_id?: string;
}

export interface UserStatusOption {
  id: string;
  status_code: string;
}

export type UserFormMode = 'create' | 'edit';

export interface UserFormProps {
  mode: UserFormMode;
  user?: User | null;
  roles: { id: string; name: string }[];
  statuses?: UserStatusOption[];
  onSubmit: (values: UserFormOutput) => Promise<void>;
  submitLabel?: string;
}
