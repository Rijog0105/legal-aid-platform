import { format, parseISO } from 'date-fns';

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

/**
 * Format a time string (HH:mm:ss) to 12-hour format.
 */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Format currency in INR.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Capitalize first letter of each word.
 */
export function titleCase(str: string): string {
  return str
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a unique ID (for client-side temporary use).
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Pluralize a word based on count.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : p}`;
}
