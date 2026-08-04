// Display formatting only — never used for values sent back to the API,
// which should stay in the raw shapes the backend expects (YYYY-MM-DD,
// plain numbers, etc.).

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'time' | 'datetime';

const DATE_FORMATTERS: Record<
  Exclude<DateFormatStyle, 'time' | 'datetime'>,
  Intl.DateTimeFormat
> = {
  short: new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }),
  medium: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  long: new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
};
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Formats a date string/Date for display. Returns the original input unchanged if it doesn't parse. */
export function formatDate(
  value: string | Date | null | undefined,
  style: DateFormatStyle = 'medium'
): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  if (style === 'time') return TIME_FORMATTER.format(date);
  if (style === 'datetime') return DATETIME_FORMATTER.format(date);
  return DATE_FORMATTERS[style].format(date);
}

/** "2 hours ago", "just now", "in 3 days" — falls back to `formatDate` beyond ~a month either way. */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  if (Math.abs(diffSeconds) < 60) return 'just now';
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  return formatDate(date, 'medium');
}

/** Defaults to USD — pass `currency` for others. Consultation fees etc. are stored as plain numbers on the backend. */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'USD'
): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

/** "+15550123456" / "5550123456" -> "+1 (555) 012-3456" style grouping for US-length numbers; anything else is returned trimmed and unchanged. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const digits = value.replace(/[^\d]/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value.trim();
}

/** "jane doe" -> "Jane Doe". Doesn't touch names already in mixed case (avoids mangling e.g. "McDonald"). */
export function formatName(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed !== trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** "Jane Doe" -> "JD" (or "J" for a single word). Used for avatar fallbacks. */
export function getInitials(name: string | null | undefined, maxLetters = 2): string {
  if (!name) return '';
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean);
  return letters.slice(0, maxLetters).join('');
}

/** "Sarah Connor" -> "Dr. Sarah Connor" (no-op if already prefixed). */
export function formatDoctorName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

/** "87" / 87.4 -> "87%" — the AI confidence fields are plain numbers 0-100, not fractions. */
export function formatPercent(
  value: number | string | null | undefined,
  fractionDigits = 0
): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) return '—';
  return `${numeric.toFixed(fractionDigits)}%`;
}
