import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from './icons';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface BaseProps {
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  error?: string;
  placeholder?: string;
  fullWidth?: boolean;
  className?: string;
}

export interface SingleDatePickerProps extends BaseProps {
  range?: false;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  showTime?: boolean;
}

export interface RangeDatePickerProps extends BaseProps {
  range: true;
  value?: DateRange;
  onChange?: (range: DateRange) => void;
}

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps;

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' });

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWithinRange(day: Date, min?: Date, max?: Date): boolean {
  const d = stripTime(day).getTime();
  if (min && d < stripTime(min).getTime()) return false;
  if (max && d > stripTime(max).getTime()) return false;
  return true;
}

function buildMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function setTimeOnDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date(date);
  next.setHours(hours || 0, minutes || 0, 0, 0);
  return next;
}

function toTimeInputValue(date: Date | null): string {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function DatePicker(props: DatePickerProps) {
  const {
    minDate,
    maxDate,
    label,
    error,
    placeholder = 'Select date',
    fullWidth = true,
    className,
  } = props;
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const anchorDate = props.range ? (props.value?.start ?? new Date()) : (props.value ?? new Date());
  const [viewMonth, setViewMonth] = useState(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const goToMonth = (offset: number) => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + offset, 1));
  };

  const handleDayClick = (day: Date) => {
    if (!isWithinRange(day, minDate, maxDate)) return;

    if (props.range) {
      const current = props.value ?? { start: null, end: null };
      if (!current.start || (current.start && current.end)) {
        props.onChange?.({ start: stripTime(day), end: null });
      } else if (day < current.start) {
        props.onChange?.({ start: stripTime(day), end: current.start });
      } else {
        props.onChange?.({ start: current.start, end: stripTime(day) });
      }
    } else {
      const withTime = props.value ? setTimeOnDate(day, toTimeInputValue(props.value)) : day;
      props.onChange?.(withTime);
      if (!props.showTime) setOpen(false);
    }
  };

  const handleTimeChange = (time: string) => {
    if (props.range) return;
    const base = props.value ?? new Date();
    props.onChange?.(setTimeOnDate(base, time));
  };

  const displayValue = () => {
    if (props.range) {
      const { start, end } = props.value ?? { start: null, end: null };
      if (!start) return placeholder;
      if (!end) return dateFmt.format(start);
      return `${dateFmt.format(start)} – ${dateFmt.format(end)}`;
    }
    if (!props.value) return placeholder;
    return props.showTime
      ? `${dateFmt.format(props.value)}, ${timeFmt.format(props.value)}`
      : dateFmt.format(props.value);
  };

  const isInHoverRange = (day: Date): boolean => {
    if (!props.range) return false;
    const { start, end } = props.value ?? { start: null, end: null };
    if (!start || end) return false;
    const rangeEnd = hoverDate ?? start;
    const [lo, hi] = day < rangeEnd ? [day, rangeEnd] : [rangeEnd, day];
    return day >= stripTime(lo) && day <= stripTime(hi);
  };

  const isSelected = (day: Date): boolean => {
    if (props.range) {
      return isSameDay(day, props.value?.start ?? null) || isSameDay(day, props.value?.end ?? null);
    }
    return isSameDay(day, props.value ?? null);
  };

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    viewMonth
  );
  const hasSelection = props.range ? !!props.value?.start : !!props.value;

  return (
    <div ref={rootRef} className={cn(fullWidth && 'w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            // bg-white is hardcoded (not theme-aware), so text-gray-700
            // needs to be explicit too, not just the placeholder case below
            // — otherwise a selected date inherits the app's dark-mode text
            // color and becomes near-invisible on this white field.
            'flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm text-gray-700 shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
            !hasSelection && 'text-gray-400'
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{displayValue()}</span>
        </button>

        {open && (
          <div className="absolute z-40 mt-1.5 w-72 rounded-lg border border-gray-100 bg-white p-3 shadow-lg animate-fade-in">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                aria-label="Previous month"
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                aria-label="Next month"
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-gray-400">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
              {grid.map((day) => {
                const outOfMonth = day.getMonth() !== viewMonth.getMonth();
                const disabled = !isWithinRange(day, minDate, maxDate);
                const selected = isSelected(day);
                const inHoverRange = isInHoverRange(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => setHoverDate(day)}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      // This popup's background is a hardcoded bg-white
                      // regardless of app theme (see the container div
                      // above), so its text needs an explicit color too —
                      // without one, these buttons inherit the app's
                      // dark-mode text color from a distant ancestor and
                      // render as near-invisible light text on the white
                      // popup.
                      'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition-colors',
                      outOfMonth && 'text-gray-300',
                      disabled && 'cursor-not-allowed opacity-30',
                      !disabled && !selected && 'hover:bg-gray-100',
                      inHoverRange && !selected && 'bg-primary-50',
                      selected && 'bg-primary-600 font-semibold text-white'
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {!props.range && props.showTime && (
              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  value={toTimeInputValue(props.value ?? null)}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto rounded-md bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default DatePicker;
