import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from './icons';
import { Input } from './Input';
import { Pagination } from './Pagination';
import { Loader } from './Loader';

export interface TableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  /** Value used for sorting/searching; defaults to the rendered `accessor` output when it's a primitive. */
  sortAccessor?: (row: T) => string | number;
  searchAccessor?: (row: T) => string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  className?: string;
}

type SortDirection = 'asc' | 'desc';

const ALIGN_CLASSES: Record<NonNullable<TableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'No records found.',
  searchable = false,
  searchPlaceholder = 'Search…',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  className,
}: TableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  const selected = selectedKeys ?? internalSelected;
  const setSelected = (keys: string[]) => {
    if (onSelectionChange) onSelectionChange(keys);
    else setInternalSelected(keys);
  };

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const text = col.searchAccessor
          ? col.searchAccessor(row)
          : typeof col.accessor(row) === 'string' || typeof col.accessor(row) === 'number'
            ? String(col.accessor(row))
            : '';
        return text.toLowerCase().includes(q);
      })
    );
  }, [data, columns, query, searchable]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return filtered;
    const getValue =
      column.sortAccessor ??
      ((row: T) => {
        const v = column.accessor(row);
        return typeof v === 'string' || typeof v === 'number' ? v : '';
      });
    return [...filtered].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize]
  );

  const toggleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir('asc');
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    }
  };

  const allOnPageSelected =
    pageData.length > 0 && pageData.every((row) => selected.includes(rowKey(row)));

  const toggleSelectAllOnPage = () => {
    const pageKeys = pageData.map(rowKey);
    if (allOnPageSelected) {
      setSelected(selected.filter((k) => !pageKeys.includes(k)));
    } else {
      setSelected(Array.from(new Set([...selected, ...pageKeys])));
    }
  };

  const toggleRow = (key: string) => {
    setSelected(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {searchable && (
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          leftIcon={<SearchIcon className="h-4 w-4" />}
          fullWidth={false}
          containerClassName="max-w-xs"
        />
      )}

      <div className="relative overflow-x-auto rounded-lg border border-gray-200">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <Loader size="md" />
          </div>
        )}

        <table className="w-full min-w-[32rem] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all rows on this page"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'px-3 py-2.5 font-semibold text-gray-600',
                    ALIGN_CLASSES[col.align ?? 'left']
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUpIcon className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronDownIcon className="h-3.5 w-3.5 opacity-20" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageData.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-10 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row) => {
                const key = rowKey(row);
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    {selectable && (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.includes(key)}
                          onChange={() => toggleRow(key)}
                          aria-label="Select row"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-2.5 text-gray-700',
                          ALIGN_CLASSES[col.align ?? 'left']
                        )}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

export default Table;
