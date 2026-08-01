import { useState } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@kafi/ui';
import { cn } from '@kafi/ui';
import { type DateRange } from 'react-day-picker';

function formatDate(date?: Date) {
  return date
    ? date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select a range',
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to
      ? `${formatDate(value.from)} - ${formatDate(value.to)}`
      : formatDate(value.from)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value?.from && 'text-muted-foreground',
            )}
          >
            <CalendarBlankIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => onChange(range)}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
