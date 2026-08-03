'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from 'react-day-picker';
import { Button } from './button';
import { cn } from '@ui/lib/utils';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  month: controlledMonth,
  onMonthChange,
  defaultMonth,
  startMonth,
  endMonth,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  // View state: 'days' | 'months' | 'years'
  const [view, setView] = React.useState<'days' | 'months' | 'years'>('days');

  // Active calendar date
  const [navDate, setNavDate] = React.useState<Date>(
    controlledMonth || defaultMonth || new Date(),
  );

  // Independent year grid paging (e.g. 2016 for 2016-2027 range)
  const [yearPageStart, setYearPageStart] = React.useState<number>(
    () =>
      Math.floor(
        (controlledMonth || defaultMonth || new Date()).getFullYear() / 12,
      ) * 12,
  );

  // Year selected when browsing months view
  const [viewYear, setViewYear] = React.useState<number>(() =>
    (controlledMonth || defaultMonth || new Date()).getFullYear(),
  );

  // Sync internal state when parent controls `month`
  React.useEffect(() => {
    if (controlledMonth) {
      setNavDate(controlledMonth);
    }
  }, [controlledMonth]);

  const handleMonthChange = (newDate: Date) => {
    setNavDate(newDate);
    onMonthChange?.(newDate);
  };

  const today = new Date();
  const startYear = startMonth ? startMonth.getFullYear() : 1900;
  const endYear = endMonth ? endMonth.getFullYear() : 2100;

  // Header label click toggle
  const handleToggleView = () => {
    if (view === 'days') {
      const yr = navDate.getFullYear();
      setYearPageStart(Math.floor(yr / 12) * 12);
      setView('years');
    } else if (view === 'months') {
      setYearPageStart(Math.floor(viewYear / 12) * 12);
      setView('years');
    } else {
      setView('days');
    }
  };

  // Navigation arrows handler per view
  const handlePrev = () => {
    if (view === 'days') {
      handleMonthChange(
        new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1),
      );
    } else if (view === 'months') {
      setViewYear((prev) => Math.max(prev - 1, startYear));
    } else if (view === 'years') {
      setYearPageStart((prev) =>
        Math.max(prev - 12, Math.floor(startYear / 12) * 12),
      );
    }
  };

  const handleNext = () => {
    if (view === 'days') {
      handleMonthChange(
        new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1),
      );
    } else if (view === 'months') {
      setViewYear((prev) => Math.min(prev + 1, endYear));
    } else if (view === 'years') {
      setYearPageStart((prev) =>
        Math.min(prev + 12, Math.floor(endYear / 12) * 12),
      );
    }
  };

  return (
    <div
      className={cn(
        'w-full rounded-xl bg-card p-3 text-card-foreground shadow-sm',
        className,
      )}
    >
      {/* Dynamic Header */}
      <div className="relative flex items-center justify-between h-9 mb-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handlePrev}
          type="button"
          disabled={
            view === 'years'
              ? yearPageStart <= startYear
              : view === 'months'
                ? viewYear <= startYear
                : false
          }
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        {/* Dynamic Label Trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 font-semibold text-sm hover:bg-accent hover:text-accent-foreground px-2"
          onClick={handleToggleView}
          type="button"
        >
          {view === 'days' &&
            navDate.toLocaleString(locale?.code || 'default', {
              month: 'short',
              year: 'numeric',
            })}
          {view === 'months' && viewYear}
          {view === 'years' && `${yearPageStart} - ${yearPageStart + 11}`}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={handleNext}
          type="button"
          disabled={
            view === 'years'
              ? yearPageStart + 11 >= endYear
              : view === 'months'
                ? viewYear >= endYear
                : false
          }
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      {/* 3x4 Years Grid View - Fixed Layout */}
      {view === 'years' && (
        <div className="grid grid-cols-3 gap-2 w-full">
          {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((yr) => {
            const isSelected = navDate.getFullYear() === yr;
            const isCurrentYear = today.getFullYear() === yr;
            const isDisabled = yr < startYear || yr > endYear;

            return (
              <Button
                key={yr}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                disabled={isDisabled}
                className={cn(
                  'h-10 w-full text-xs font-medium rounded-lg transition-all',
                  !isSelected &&
                    isCurrentYear &&
                    'bg-accent/60 text-accent-foreground font-semibold border border-primary/20',
                )}
                onClick={() => {
                  setViewYear(yr);
                  setView('months');
                }}
                type="button"
              >
                {yr}
              </Button>
            );
          })}
        </div>
      )}

      {/* 3x4 Months Grid View - Fixed Layout */}
      {view === 'months' && (
        <div className="grid grid-cols-3 gap-2 w-full">
          {MONTHS.map((monthName, idx) => {
            const isSelected =
              navDate.getFullYear() === viewYear && navDate.getMonth() === idx;
            const isCurrentMonth =
              today.getFullYear() === viewYear && today.getMonth() === idx;

            const isDisabled =
              (startMonth &&
                (viewYear < startYear ||
                  (viewYear === startYear && idx < startMonth.getMonth()))) ||
              (endMonth &&
                (viewYear > endYear ||
                  (viewYear === endYear && idx > endMonth.getMonth())));

            return (
              <Button
                key={monthName}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                disabled={isDisabled}
                className={cn(
                  'h-10 w-full text-xs font-medium rounded-lg transition-all',
                  !isSelected &&
                    isCurrentMonth &&
                    'bg-accent/60 text-accent-foreground font-semibold border border-primary/20',
                )}
                onClick={() => {
                  handleMonthChange(new Date(viewYear, idx, 1));
                  setView('days');
                }}
                type="button"
              >
                {monthName}
              </Button>
            );
          })}
        </div>
      )}

      {/* Days View - Responsive Layout */}
      {view === 'days' && (
        <div className="w-full overflow-x-auto">
          <DayPicker
            month={navDate}
            onMonthChange={handleMonthChange}
            showOutsideDays={showOutsideDays}
            className="p-0"
            locale={locale}
            startMonth={startMonth}
            endMonth={endMonth}
            classNames={{
              root: cn('w-full', defaultClassNames.root),
              months: cn(
                'flex flex-col md:flex-row md:gap-4 gap-4 w-full',
                defaultClassNames.months,
              ),
              month: cn(
                'flex w-full md:flex-1 flex-col gap-2 min-w-max md:min-w-0',
                defaultClassNames.month,
              ),
              nav: 'hidden',
              month_caption: 'hidden',
              month_grid: cn(
                'w-full border-collapse',
                defaultClassNames.month_grid,
              ),
              weekdays: cn(
                'flex justify-between mb-1',
                defaultClassNames.weekdays,
              ),
              weekday: cn(
                'w-8 text-center text-[0.75rem] font-medium text-muted-foreground select-none',
                defaultClassNames.weekday,
              ),
              week: cn(
                'mt-1 flex w-full justify-between',
                defaultClassNames.week,
              ),
              day: cn(
                'group/day relative p-0 text-center select-none text-sm',
                defaultClassNames.day,
              ),
              today: cn(
                'rounded-md bg-accent text-accent-foreground font-bold',
                defaultClassNames.today,
              ),
              outside: cn(
                'text-muted-foreground/40',
                defaultClassNames.outside,
              ),
              disabled: cn(
                'text-muted-foreground/30',
                defaultClassNames.disabled,
              ),
              ...classNames,
            }}
            components={{
              DayButton: ({ ...props }) => (
                <CalendarDayButton locale={locale} {...props} />
              ),
            }}
            {...props}
          />
        </div>
      )}
    </div>
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'size-10 p-0 font-normal border-none rounded-md transition-colors',
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:font-semibold',
        'data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:rounded-r-none',
        'data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:rounded-l-none',
        'data-[range-middle=true]:bg-accent/20 data-[range-middle=true]:text-foreground data-[range-middle=true]:rounded-none',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
