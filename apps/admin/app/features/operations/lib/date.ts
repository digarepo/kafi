export function toYmd(date?: Date): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYmd(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
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

export function displayDate(value?: string | Date | null): string {
  let date: Date | undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    date = value;
  } else if (typeof value === 'string') {
    date = parseYmd(value);
    if (!date) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
  }
  return date
    ? date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';
}
