'use client';

/**
 * Single-date picker using the shadcn/ui Calendar.
 *
 * @remarks
 * - Converts between `yyyy-mm-dd` strings and `Date` objects.
 * - Mirrors the packages `DateRangePicker` pattern.
 */

import { useState } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@kafi/ui';

import { parseYmd, toYmd } from '../lib/date';

interface DatePickerProps {
  /** Selected date as an ISO-8601 `yyyy-mm-dd` string. */
  value?: string | null;

  /** Called when the user picks or clears a date. */
  onChange: (value: string) => void;

  /** Placeholder text shown when no date is selected. */
  placeholder?: string;

  /** Whether the picker is disabled. */
  disabled?: boolean;

  /** ID for the trigger button. */
  id?: string;
}

/**
 * Render a calendar popover for selecting a single date.
 *
 * @param props - The picker props.
 * @returns The date picker element.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = parseYmd(value);
  const label = date
    ? date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarBlankIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange(toYmd(d) ?? '');
            setOpen(false);
          }}
          defaultMonth={date ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
