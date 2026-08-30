import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { trackEvent, trackPageView, trackServerEvent } from './analytics';

describe('analytics (GA4)', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TEST123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    // Reset window to original so SSR checks work.
    if (originalWindow === undefined) {
      // @ts-expect-error — intentionally undefined for SSR test isolation
      delete globalThis.window;
    }
  });

  describe('trackEvent', () => {
    it('calls gtag when configured', () => {
      window.gtag = vi.fn();
      trackEvent('share', { channel: 'whatsapp' });
      expect(window.gtag).toHaveBeenCalledWith('event', 'share', {
        channel: 'whatsapp',
      });
    });

    it('does nothing when gtag is not loaded', () => {
      delete (window as any).gtag;
      expect(() => trackEvent('share')).not.toThrow();
    });

    it('swallows errors from gtag', () => {
      window.gtag = vi.fn(() => {
        throw new Error('GA4 error');
      });
      expect(() => trackEvent('share')).not.toThrow();
    });
  });

  describe('trackPageView', () => {
    it('sends a page_view event with the path', () => {
      window.gtag = vi.fn();
      trackPageView('/packages/test-slug');
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/packages/test-slug',
        send_to: 'G-TEST123',
      });
    });

    it('does nothing when gtag is not loaded', () => {
      delete (window as any).gtag;
      expect(() => trackPageView('/')).not.toThrow();
    });
  });

  describe('trackServerEvent', () => {
    it('POSTs the event to the first-party API', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response());
      vi.stubGlobal('fetch', fetchMock);

      await trackServerEvent(
        'share',
        { channel: 'whatsapp', content_type: 'package', content_id: 'test' },
        {
          anonymous_visitor_id: 'visitor-123',
          utm_source: 'telegram',
          utm_medium: 'social',
        },
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('/api/public/events');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.event_name).toBe('share');
      expect(body.payload.channel).toBe('whatsapp');
      expect(body.anonymous_visitor_id).toBe('visitor-123');
      expect(body.utm_source).toBe('telegram');
    });

    it('swallows fetch errors', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network')));
      await expect(
        trackServerEvent('share', { channel: 'whatsapp' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('SSR safety', () => {
    it('trackEvent does nothing on the server (no window)', () => {
      // @ts-expect-error — intentionally undefined for SSR test isolation
      delete globalThis.window;
      expect(() => trackEvent('share')).not.toThrow();
    });

    it('trackPageView does nothing on the server (no window)', () => {
      // @ts-expect-error — intentionally undefined for SSR test isolation
      delete globalThis.window;
      expect(() => trackPageView('/')).not.toThrow();
    });

    it('trackServerEvent does nothing on the server (no window)', async () => {
      // @ts-expect-error — intentionally undefined for SSR test isolation
      delete globalThis.window;
      await expect(
        trackServerEvent('share', { channel: 'whatsapp' }),
      ).resolves.toBeUndefined();
    });
  });
});
