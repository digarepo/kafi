/**
 * Format a monetary value as a currency string.
 *
 * Uses the ETB currency code with thousands separators and two decimal
 * places, e.g. `18,000.00 ETB`.
 *
 * @param value - The amount to format (number, string, null, or undefined).
 * @param currencyCode - ISO 4217 code; defaults to `ETB`.
 * @returns Formatted string, or `—` for null/undefined.
 */
export function formatMoney(
  value: number | string | null | undefined,
  currencyCode = 'ETB',
): string {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode}`;
}

/**
 * Normalize a finance lookup option into a stable `{ id, code, name }` shape.
 *
 * The finance reference-data endpoints return raw schema rows whose code
 * column is named per-table (`status_code`, `type_code`, `category_code`,
 * `source_code`). This helper picks the first non-empty code field and
 * returns a normalized option so downstream UI code can rely on `code`
 * regardless of the source table.
 */
export function normalizeLookupOption(option: {
  id: string;
  name: string;
  code?: string;
  status_code?: string;
  type_code?: string;
  category_code?: string;
  source_code?: string;
}): { id: string; code: string; name: string } {
  return {
    id: option.id,
    code:
      option.code ??
      option.status_code ??
      option.type_code ??
      option.category_code ??
      option.source_code ??
      option.id,
    name: option.name,
  };
}

/**
 * Format a phone number into E.164 display form with readable spacing.
 *
 * Handles Ethiopian local numbers (leading `0`), numbers already prefixed
 * with `251`, and numbers already in E.164 (`+…`). Non-Ethiopian numbers
 * that already start with `+` are returned with grouped spacing; others
 * are prefixed with `+251` as a sensible default for this application.
 *
 * @param value - Raw phone number string.
 * @returns E.164-formatted string like `+25191 234 5678`, or `—` for empty.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const digits = value.replace(/[^\d+]/g, '');

  let normalized: string;
  if (digits.startsWith('+')) {
    normalized = digits.slice(1);
  } else if (digits.startsWith('251')) {
    normalized = digits.slice(0);
  } else if (digits.startsWith('0')) {
    normalized = `251${digits.slice(1)}`;
  } else {
    normalized = `251${digits}`;
  }

  // Ethiopian numbers: +251 XX XXX XXXX
  if (normalized.startsWith('251')) {
    const local = normalized.slice(3);
    if (local.length <= 2) return `+251 ${local}`;
    if (local.length <= 5) return `+251${local.slice(0, 2)} ${local.slice(2)}`;
    return `+251${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }

  // Fallback: group remaining digits in 3s after a short country code
  return `+${normalized.replace(/(\d{1,3})(?=\d)/g, '$1 ')}`.trim();
}
