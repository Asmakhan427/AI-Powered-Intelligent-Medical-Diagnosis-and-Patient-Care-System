import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon, SearchIcon } from './icons';

export type DropdownItem =
  | {
      type: 'item';
      id: string;
      label: string;
      icon?: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }
  | {
      type: 'checkbox';
      id: string;
      label: string;
      icon?: ReactNode;
      checked: boolean;
      onChange: (checked: boolean) => void;
      disabled?: boolean;
    }
  | { type: 'divider'; id: string };

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  triggerOn?: 'click' | 'hover';
  align?: 'left' | 'right';
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  triggerOn = 'click',
  align = 'left',
  searchable = false,
  searchPlaceholder = 'Search…',
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const hoverHandlers =
    triggerOn === 'hover'
      ? {
          onMouseEnter: () => {
            clearTimeout(closeTimer.current);
            setOpen(true);
          },
          onMouseLeave: () => {
            closeTimer.current = setTimeout(() => setOpen(false), 150);
          },
        }
      : {};

  const filteredItems = searchable
    ? items.filter(
        (item) => item.type === 'divider' || item.label.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)} {...hoverHandlers}>
      <div
        onClick={triggerOn === 'click' ? () => setOpen((o) => !o) : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-2 min-w-[12rem] rounded-lg border border-gray-100 bg-white py-1 shadow-lg animate-fade-in',
            'dark:border-gray-800 dark:bg-gray-900',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {searchable && (
            <div className="border-b border-gray-100 px-2 pb-2 dark:border-gray-800">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-md border border-gray-200 py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {filteredItems.map((item) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={item.id}
                  role="separator"
                  className="my-1 h-px bg-gray-100 dark:bg-gray-800"
                />
              );
            }

            if (item.type === 'checkbox') {
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={item.checked}
                  disabled={item.disabled}
                  onClick={() => item.onChange(!item.checked)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      item.checked
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {item.checked && <CheckIcon className="h-3 w-3" />}
                  </span>
                  {item.icon}
                  {item.label}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}

          {filteredItems.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
