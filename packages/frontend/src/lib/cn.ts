import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class lists and resolves conflicting Tailwind utility classes
 * (e.g. `cn('px-2', condition && 'px-4')` keeps only `px-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
