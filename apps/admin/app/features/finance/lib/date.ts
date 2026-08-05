/**
 * Date helpers for the finance admin forms.
 *
 * @remarks
 * - Mirrors `apps/admin/app/features/travellers/lib/date.ts`.
 */

/**
 * Convert a `Date` to an ISO-8601 `yyyy-mm-dd` string.
 *
 * @param date - The date to convert.
 * @returns The `yyyy-mm-dd` representation, or `undefined` if no date is provided.
 */
export function toYmd(date?: Date): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an ISO-8601 `yyyy-mm-dd` string into a local `Date`.
 *
 * @param value - The date string to parse.
 * @returns The parsed `Date`, or `undefined` if the input is empty or invalid.
 */
export function parseYmd(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return undefined;
  }
  return date;
}
