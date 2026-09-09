import * as React from "react";
import { CalendarBlankIcon, ClockIcon } from "@phosphor-icons/react";
import { Calendar } from "./calendar";
import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@ui/lib/utils";
import type { Matcher } from "react-day-picker";

export interface DateTimePickerProps {
  value?: Date;
  onChange: (value?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
}

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

export function formatCalendarDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(
    2,
    "0"
  )}`;
}

export function withTime(date: Date, time: string): Date {
  const next = new Date(date);
  const [hours, minutes] = time.split(":").map(Number);
  next.setHours(hours || 0, minutes || 0, 0, 0);
  return next;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled,
  minDate,
  maxDate,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date | undefined>(value);
  const [draftTime, setDraftTime] = React.useState(value ? formatTime(value) : "00:00");

  React.useEffect(() => {
    if (open) {
      setDraft(value);
      setDraftTime(value ? formatTime(value) : "00:00");
    }
  }, [open, value]);

  const draftWithTime = draft ? withTime(draft, draftTime) : undefined;
  const disabledDates: Matcher[] = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  function handleDateChange(next?: Date) {
    if (!next) {
      setDraft(undefined);
      return;
    }
    setDraft(withTime(next, draftTime));
  }

  function handleTimeChange(nextTime: string) {
    setDraftTime(nextTime);
    if (draft) setDraft(withTime(draft, nextTime));
  }

  function handleConfirm() {
    onChange(draftWithTime);
    setOpen(false);
  }

  function handleCancel() {
    setDraft(value);
    setDraftTime(value ? formatTime(value) : "00:00");
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
              !value && "text-muted-foreground"
            )}
          >
            <CalendarBlankIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{value ? formatCalendarDateTime(value) : placeholder}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={draft}
          onSelect={handleDateChange}
          defaultMonth={draft ?? minDate ?? new Date()}
          startMonth={minDate}
          endMonth={maxDate}
          disabled={disabledDates.length > 0 ? disabledDates : undefined}
        />
        <div className="space-y-2 border-t p-3">
          <label
            htmlFor={`${id ?? "date-time"}-time`}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            Time
          </label>
          <Select
            value={draftTime}
            onValueChange={(next) => handleTimeChange(next ?? "00:00")}
            disabled={!draft}
          >
            <SelectTrigger id={`${id ?? "date-time"}-time`} className="w-full">
              <SelectValue placeholder="Select time" />
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
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={!draft}>
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
