import { useEffect, useState } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@kafi/ui';
import { cn } from '@kafi/ui';
import { type DateRange, type Matcher } from 'react-day-picker';

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
  /** Optional bounds passed through to the Calendar. */
  minDate?: Date | null;
  maxDate?: Date | null;
  disabledRanges?: DateRange[];
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select a range',
  disabled,
  minDate,
  maxDate,
  disabledRanges = [],
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // Draft holds the in-progress selection while the popover is open.
  // Only committed to onChange when the user clicks "Confirm".
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  // Sync draft when the popover opens or external value changes.
  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const label = value?.from
    ? value.to
      ? `${formatDate(value.from)} - ${formatDate(value.to)}`
      : formatDate(value.from)
    : placeholder;

  function handleConfirm() {
    onChange(draft);
    setOpen(false);
  }

  function handleCancel() {
    setDraft(value);
    setOpen(false);
  }

  // Build disabled matcher from bounds.
  const disabledMatchers = (() => {
    const conditions: Matcher[] = [];
    if (minDate) {
      const dayBefore = new Date(minDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      conditions.push({ before: dayBefore });
    }
    if (maxDate) {
      conditions.push({ after: maxDate });
    }
    for (const range of disabledRanges) {
      if (range.from && range.to) {
        conditions.push({ from: range.from, to: range.to });
      }
    }
    return conditions.length > 0 ? conditions : undefined;
  })();

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
            <span className="truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="range"
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={2}
          disabled={disabledMatchers}
          defaultMonth={draft?.from ?? minDate ?? new Date()}
          startMonth={minDate ?? undefined}
          endMonth={maxDate ?? undefined}
        />
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
