import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Controlled active tab id. Omit to let Tabs manage its own state. */
  activeId?: string;
  defaultActiveId?: string;
  onChange?: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Tabs({
  items,
  activeId,
  defaultActiveId,
  onChange,
  orientation = 'horizontal',
  className,
}: TabsProps) {
  const groupId = useId();
  const [internalActive, setInternalActive] = useState(
    defaultActiveId ?? items.find((i) => !i.disabled)?.id ?? items[0]?.id
  );
  const active = activeId ?? internalActive;

  const setActive = (id: string) => {
    if (activeId === undefined) setInternalActive(id);
    onChange?.(id);
  };

  const enabledItems = items.filter((i) => !i.disabled);

  const focusTab = (id: string) => {
    document.getElementById(`${groupId}-tab-${id}`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const idx = enabledItems.findIndex((i) => i.id === active);
    if (idx === -1) return;

    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';

    if (event.key === nextKey) {
      event.preventDefault();
      const next = enabledItems[(idx + 1) % enabledItems.length];
      setActive(next.id);
      focusTab(next.id);
    } else if (event.key === prevKey) {
      event.preventDefault();
      const prev = enabledItems[(idx - 1 + enabledItems.length) % enabledItems.length];
      setActive(prev.id);
      focusTab(prev.id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(enabledItems[0].id);
      focusTab(enabledItems[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = enabledItems[enabledItems.length - 1];
      setActive(last.id);
      focusTab(last.id);
    }
  };

  const activeItem = items.find((i) => i.id === active);

  return (
    <div className={cn(orientation === 'vertical' && 'flex gap-6', className)}>
      <div
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          orientation === 'horizontal'
            ? 'flex gap-1 border-b border-gray-200'
            : 'flex w-48 shrink-0 flex-col gap-1 border-r border-gray-200 pr-2'
        )}
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              id={`${groupId}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${groupId}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => setActive(item.id)}
              onKeyDown={handleKeyDown}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-40',
                orientation === 'horizontal'
                  ? cn(
                      '-mb-px border-b-2',
                      isActive
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    )
                  : cn(
                      'rounded-md text-left',
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'
                    )
              )}
            >
              {item.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
              {item.badge !== undefined && <span className="shrink-0">{item.badge}</span>}
            </button>
          );
        })}
      </div>

      <div className={orientation === 'horizontal' ? 'mt-4' : 'flex-1'}>
        {activeItem && (
          <div
            id={`${groupId}-panel-${activeItem.id}`}
            role="tabpanel"
            aria-labelledby={`${groupId}-tab-${activeItem.id}`}
            tabIndex={0}
          >
            {activeItem.content}
          </div>
        )}
      </div>
    </div>
  );
}

export default Tabs;
