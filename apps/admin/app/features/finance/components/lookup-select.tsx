/**
 * Lookup select that always renders the human-readable label on the trigger.
 *
 * @remarks
 * - Mirrors `apps/admin/app/features/travellers/components/lookup-select.tsx`.
 */

import { Select, SelectContent, SelectItem, SelectTrigger } from '@kafi/ui';

interface LookupOption {
  value: string;
  label: string;
}

interface LookupSelectProps {
  /** Current selected value. */
  value?: string;

  /** Options to display. */
  options: LookupOption[];

  /** Placeholder when nothing is selected. */
  placeholder?: string;

  /** Change callback. */
  onChange: (value: string) => void;

  /** Optional ARIA invalid flag. */
  'aria-invalid'?: boolean;

  /** Additional classes for the trigger. */
  className?: string;
}

/**
 * Render a select with a labelled trigger.
 *
 * @param props - The lookup select props.
 * @returns The lookup select element.
 */
export function LookupSelect({
  value,
  options,
  placeholder = 'Select',
  onChange,
  'aria-invalid': ariaInvalid,
  className,
}: LookupSelectProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger
        className={`h-9 w-full ${className ?? ''}`}
        aria-invalid={ariaInvalid}
      >
        {selected?.label ?? placeholder}
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
