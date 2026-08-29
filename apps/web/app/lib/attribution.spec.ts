import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  captureAttribution,
  getAttribution,
  getAttributionWithVisitor,
  getOrCreateVisitorId,
} from './attribution';

describe('attribution', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('captureAttribution', () => {
    it('captures UTM parameters from the current URL', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        search: '?utm_source=google&utm_medium=cpc&utm_campaign=ramadan-2026',
      } as any);

      captureAttribution();

      const attr = getAttribution();
      expect(attr?.utm_source).toBe('google');
      expect(attr?.utm_medium).toBe('cpc');
      expect(attr?.utm_campaign).toBe('ramadan-2026');
    });

    it('does not overwrite existing attribution when no UTM params are present', () => {
      // First capture with UTM
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        search: '?utm_source=google',
      } as any);
      captureAttribution();

      // Navigate to a page without UTM
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        search: '',
      } as any);
      captureAttribution();

      const attr = getAttribution();
      expect(attr?.utm_source).toBe('google');
    });

    it('captures the source parameter', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        search: '?source=homepage',
      } as any);

      captureAttribution();

      const attr = getAttribution();
      expect(attr?.source).toBe('homepage');
    });

    it('does nothing when no attribution params are present and none stored', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        search: '',
      } as any);

      captureAttribution();
      expect(getAttribution()).toBeUndefined();
    });
  });

  describe('getOrCreateVisitorId', () => {
    it('generates a UUID v4 on first call', () => {
      const id = getOrCreateVisitorId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('returns the same ID on subsequent calls', () => {
      const id1 = getOrCreateVisitorId();
      const id2 = getOrCreateVisitorId();
      expect(id1).toBe(id2);
    });
  });

  describe('getAttributionWithVisitor', () => {
    it('returns attribution merged with the visitor ID', () => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        search: '?utm_source=google',
      } as any);
      captureAttribution();

      const result = getAttributionWithVisitor();
      expect(result?.utm_source).toBe('google');
      expect(result?.anonymous_visitor_id).toMatch(/^[0-9a-f]{8}-/);
    });
  });
});
