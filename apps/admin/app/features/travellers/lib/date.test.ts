import { describe, expect, it } from 'vitest';

import { parseYmd, toYmd } from './date';

describe('date helpers', () => {
  describe('toYmd', () => {
    it('converts a Date to an ISO-8601 date string', () => {
      expect(toYmd(new Date(2026, 7, 4))).toBe('2026-08-04');
    });

    it('pads single-digit months and days', () => {
      expect(toYmd(new Date(2026, 0, 1))).toBe('2026-01-01');
    });

    it('returns undefined for an undefined input', () => {
      expect(toYmd(undefined)).toBeUndefined();
    });
  });

  describe('parseYmd', () => {
    it('parses an ISO-8601 date string into a local Date', () => {
      const date = parseYmd('2026-08-04');
      expect(date).toBeDefined();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(7);
      expect(date?.getDate()).toBe(4);
    });

    it('returns undefined for empty input', () => {
      expect(parseYmd('')).toBeUndefined();
      expect(parseYmd(null)).toBeUndefined();
      expect(parseYmd(undefined)).toBeUndefined();
    });

    it('returns undefined for malformed input', () => {
      expect(parseYmd('not-a-date')).toBeUndefined();
      expect(parseYmd('2026-13-01')).toBeUndefined();
    });
  });
});
