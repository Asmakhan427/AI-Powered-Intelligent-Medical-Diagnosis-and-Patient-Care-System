import { useId, useMemo } from 'react';
import { cn } from '../../lib/cn';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from './icons';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showFirstLast?: boolean;
  siblingCount?: number;
  className?: string;
}

const DOTS = 'dots' as const;

function buildPageList(
  current: number,
  total: number,
  siblingCount: number
): (number | typeof DOTS)[] {
  const totalVisible = siblingCount * 2 + 5; // first + last + current + 2 dots + siblings
  if (total <= totalVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblingCount, 2);
  const right = Math.min(current + siblingCount, total - 1);

  const pages: (number | typeof DOTS)[] = [1];
  if (left > 2) pages.push(DOTS);
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push(DOTS);
  pages.push(total);

  return pages;
}

const NAV_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors ' +
  'hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400';

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  showFirstLast = true,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const selectId = useId();
  const pages = useMemo(
    () => buildPageList(currentPage, Math.max(totalPages, 1), siblingCount),
    [currentPage, totalPages, siblingCount]
  );

  const goTo = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) onPageChange(page);
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {pageSizeOptions && onPageSizeChange && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <label htmlFor={selectId}>Rows per page</label>
          <select
            id={selectId}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-gray-300 py-1 pl-2 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav aria-label="Pagination" className="ml-auto flex items-center gap-1">
        {showFirstLast && (
          <button
            type="button"
            className={NAV_BUTTON}
            onClick={() => goTo(1)}
            disabled={currentPage <= 1}
            aria-label="First page"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          className={NAV_BUTTON}
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {pages.map((page, idx) =>
          page === DOTS ? (
            <span key={`dots-${idx}`} className="px-1.5 text-sm text-gray-400" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => goTo(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          className={NAV_BUTTON}
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        {showFirstLast && (
          <button
            type="button"
            className={NAV_BUTTON}
            onClick={() => goTo(totalPages)}
            disabled={currentPage >= totalPages}
            aria-label="Last page"
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </button>
        )}
      </nav>
    </div>
  );
}

export default Pagination;
