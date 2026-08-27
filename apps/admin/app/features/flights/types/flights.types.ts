import type { Registration } from '../../../lib/api.js';

export type FlightBookingFormMode = 'create' | 'edit';

export interface FlightBookingFormValues {
  registration_id: string;
  pnr: string;
  departure_flight_number: string;
  departure_date: string;
  return_flight_number: string;
  return_date: string;
  supplier_cost: string;
  notes: string;
}

export interface FlightBookingFormOutput {
  registration_id: string;
  pnr: string;
  departure_flight_number: string;
  departure_date: string;
  return_flight_number?: string;
  return_date?: string;
  supplier_cost?: number;
  notes?: string;
}

export interface FlightBookingFormProps {
  mode: FlightBookingFormMode;
  registration?: Pick<Registration, 'id' | 'registration_number' | 'traveller'>;
  onSubmit: (values: FlightBookingFormOutput) => Promise<void>;
  submitLabel?: string;
}

export interface CancelFlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
  loading?: boolean;
}
