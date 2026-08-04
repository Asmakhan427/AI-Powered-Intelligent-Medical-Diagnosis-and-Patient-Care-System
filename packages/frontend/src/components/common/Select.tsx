import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon, ChevronDownIcon, SearchIcon } from './icons';

export interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectOptionGroup<T> {
  label: string;
  options: SelectOption<T>[];
}

type SelectEntry<T> = SelectOption<T> | SelectOptionGroup<T>;

function isGroup<T>(entry: SelectEntry<T>): entry is SelectOptionGroup<T> {
  return (entry as SelectOptionGroup<T>).options !== undefined;
}

interface BaseSelectProps<T> {
  options: SelectEntry<T>[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  fullWidth?: boolean;
  renderOption?: (option: SelectOption<T>) => ReactNode;
  className?: string;
}

interface SingleSelectProps<T> extends BaseSelectProps<T> {
  multiple?: false;
  value?: T | null;
  onChange?: (value: T | null) => void;
  renderValue?: (option: SelectOption<T> | null) => ReactNode;
}

interface MultiSelectProps<T> extends BaseSelectProps<T> {
  multiple: true;
  value?: T[];
  onChange?: (value: T[]) => void;
  renderValue?: (options: SelectOption<T>[]) => ReactNode;
}

export type SelectProps<T> = SingleSelectProps<T> | MultiSelectProps<T>;

function flatten<T>(
  entries: SelectEntry<T>[]
): { groupLabel: string | null; option: SelectOption<T> }[] {
  const out: { groupLabel: string | null; option: SelectOption<T> }[] = [];
  for (const entry of entries) {
    if (isGroup(entry)) {
      for (const option of entry.options) out.push({ groupLabel: entry.label, option });
    } else {
      out.push({ groupLabel: null, option: entry });
    }
  }
  return out;
}

export function Select<T extends string | number>(props: SelectProps<T>) {
  const {
    options,
    placeholder = 'Select…',
    searchable = false,
    searchPlaceholder = 'Search…',
    disabled = false,
    label,
    error,
    fullWidth = true,
    renderOption,
    className,
  } = props;

  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);

  const flat = useMemo(() => flatten(options), [options]);
  const filtered = useMemo(
    () =>
      searchable && query.trim()
        ? flat.filter((e) => e.option.label.toLowerCase().includes(query.trim().toLowerCase()))
        : flat,
    [flat, query, searchable]
  );

  useEffect(() => {
    if (!open) setQuery('');
    setHighlighted(0);
  }, [open]);

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

  const selectedOptions: SelectOption<T>[] = props.multiple
    ? flat.filter((e) => props.value?.includes(e.option.value)).map((e) => e.option)
    : flat.filter((e) => e.option.value === props.value).map((e) => e.option);

  const isSelected = (value: T) =>
    props.multiple ? (props.value ?? []).includes(value) : props.value === value;

  const selectOption = (option: SelectOption<T>) => {
    if (option.disabled) return;
    if (props.multiple) {
      const current = props.value ?? [];
      const next = current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value];
      props.onChange?.(next);
    } else {
      props.onChange?.(option.value);
      setOpen(false);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = filtered[highlighted];
      if (entry) selectOption(entry.option);
    }
  };

  const defaultValueLabel = () => {
    if (props.multiple) {
      if (selectedOptions.length === 0) return placeholder;
      if (selectedOptions.length <= 2) return selectedOptions.map((o) => o.label).join(', ');
      return `${selectedOptions.length} selected`;
    }
    return selectedOptions[0]?.label ?? placeholder;
  };

  const valueContent = props.multiple
    ? (props.renderValue?.(selectedOptions) ?? defaultValueLabel())
    : (props.renderValue?.(selectedOptions[0] ?? null) ?? defaultValueLabel());

  let lastGroupLabel: string | null | undefined;

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
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
            selectedOptions.length === 0 && 'text-gray-400'
          )}
        >
          <span className="truncate">{valueContent}</span>
          <ChevronDownIcon
            className={cn(
              'h-4 w-4 shrink-0 text-gray-400 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-multiselectable={props.multiple}
            className="absolute z-40 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg animate-fade-in"
          >
            {searchable && (
              <div className="sticky top-0 border-b border-gray-100 bg-white px-2 pb-2 pt-1">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-gray-200 py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              </div>
            )}

            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No options</p>}

            {filtered.map((entry, idx) => {
              const showGroupHeader = entry.groupLabel !== lastGroupLabel;
              lastGroupLabel = entry.groupLabel;
              const selected = isSelected(entry.option.value);
              return (
                <div key={String(entry.option.value)}>
                  {showGroupHeader && entry.groupLabel && (
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {entry.groupLabel}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={entry.option.disabled}
                    onMouseEnter={() => setHighlighted(idx)}
                    onClick={() => selectOption(entry.option)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      idx === highlighted ? 'bg-primary-50' : 'hover:bg-gray-50',
                      selected ? 'text-primary-700' : 'text-gray-700'
                    )}
                  >
                    {props.multiple && (
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          selected
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-gray-300'
                        )}
                      >
                        {selected && <CheckIcon className="h-3 w-3" />}
                      </span>
                    )}
                    {entry.option.icon}
                    <span className="flex-1 truncate">
                      {renderOption ? renderOption(entry.option) : entry.option.label}
                    </span>
                    {!props.multiple && selected && <CheckIcon className="h-4 w-4 shrink-0" />}
                  </button>
                </div>
              );
            })}
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

export default Select;
