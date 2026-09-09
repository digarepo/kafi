import * as React from "react";
import { CalendarBlankIcon, ClockIcon } from "@phosphor-icons/react";
import type { DateRange, Matcher } from "react-day-picker";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { formatCalendarDateTime, TIME_OPTIONS, withTime } from "./date-time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { cn } from "@ui/lib/utils";

export interface DateTimeRangePickerProps {
  value?: DateRange;
  onChange: (value?: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date | null;
  maxDate?: Date | null;
  disabledRanges?: DateRange[];
  id?: string;
}

function formatRange(value?: DateRange): string {
  if (!value?.from) return "";
  const from = formatCalendarDateTime(value.from);
  return value.to ? `${from} – ${formatCalendarDateTime(value.to)}` : from;
}

export function DateTimeRangePicker({
  value,
  onChange,
  placeholder = "Select date and time range",
  disabled,
  minDate,
  maxDate,
  disabledRanges = [],
  id,
}: DateTimeRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);
  const [departureTime, setDepartureTime] = React.useState(
    value?.from ? formatTime(value.from) : "00:00"
  );
  const [arrivalTime, setArrivalTime] = React.useState(value?.to ? formatTime(value.to) : "00:00");

  React.useEffect(() => {
    if (open) {
      setDraft(value);
      setDepartureTime(value?.from ? formatTime(value.from) : "00:00");
      setArrivalTime(value?.to ? formatTime(value.to) : "00:00");
    }
  }, [open, value]);

  const disabledMatchers: Matcher[] = [
    ...(minDate ? [{ before: startOfDay(minDate) }] : []),
    ...(maxDate ? [{ after: endOfDay(maxDate) }] : []),
    ...disabledRanges.flatMap((range) =>
      range.from && range.to ? [{ from: range.from, to: range.to }] : []
    ),
  ];

  function handleRangeChange(next?: DateRange) {
    setDraft({
      from: next?.from ? withTime(next.from, departureTime) : undefined,
      to: next?.to ? withTime(next.to, arrivalTime) : undefined,
    });
  }

  function handleDepartureTime(next: string) {
    setDepartureTime(next);
    if (draft?.from) {
      setDraft({ ...draft, from: withTime(draft.from, next) });
    }
  }

  function handleArrivalTime(next: string) {
    setArrivalTime(next);
    if (draft?.to) {
      setDraft({ ...draft, to: withTime(draft.to, next) });
    }
  }

  function handleConfirm() {
    onChange(draft);
    setOpen(false);
  }

  function handleCancel() {
    setDraft(value);
    setDepartureTime(value?.from ? formatTime(value.from) : "00:00");
    setArrivalTime(value?.to ? formatTime(value.to) : "00:00");
    setOpen(false);
  }

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
              "w-full justify-start text-left font-normal",
              !value?.from && "text-muted-foreground"
            )}
          >
            <CalendarBlankIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{value?.from ? formatRange(value) : placeholder}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="range"
          selected={draft}
          onSelect={handleRangeChange}
          numberOfMonths={2}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          defaultMonth={draft?.from ?? minDate ?? new Date()}
          startMonth={minDate ?? undefined}
          endMonth={maxDate ?? undefined}
        />
        <div className="grid gap-3 border-t p-3 sm:grid-cols-2">
          <TimeSelect
            id={`${id ?? "date-time-range"}-departure-time`}
            label="Departure time"
            value={departureTime}
            onChange={handleDepartureTime}
            disabled={!draft?.from}
          />
          <TimeSelect
            id={`${id ?? "date-time-range"}-arrival-time`}
            label="Arrival time"
            value={arrivalTime}
            onChange={handleArrivalTime}
            disabled={!draft?.to}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={!draft?.from}>
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        <ClockIcon className="h-4 w-4 text-muted-foreground" />
        {label}
      </label>
      <Select value={value} onValueChange={(next) => onChange(next ?? "00:00")} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
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
  );
}

function formatTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}
