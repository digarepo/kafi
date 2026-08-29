import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  whatsappShareUrl,
  telegramShareUrl,
  smsShareUrl,
  canNativeShare,
  copyLink,
} from './share-links';

describe('share-links', () => {
  describe('whatsappShareUrl', () => {
    it('builds a correctly encoded WhatsApp share URL', () => {
      const url = whatsappShareUrl({
        url: 'https://kafitour.com/packages/ramadan-2026',
        title: 'Ramadan Umrah 2026',
        description: 'Premium package from Addis Ababa',
      });
      expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
      const text = decodeURIComponent(url.split('?text=')[1]!);
      expect(text).toContain('Ramadan Umrah 2026');
      expect(text).toContain('Premium package from Addis Ababa');
      expect(text).toContain('https://kafitour.com/packages/ramadan-2026');
    });

    it('works without a description', () => {
      const url = whatsappShareUrl({
        url: 'https://kafitour.com/packages/ramadan-2026',
        title: 'Ramadan Umrah 2026',
      });
      const text = decodeURIComponent(url.split('?text=')[1]!);
      expect(text).toBe(
        'Ramadan Umrah 2026 https://kafitour.com/packages/ramadan-2026',
      );
    });
  });

  describe('telegramShareUrl', () => {
    it('builds a correctly encoded Telegram share URL', () => {
      const url = telegramShareUrl({
        url: 'https://kafitour.com/packages/ramadan-2026',
        title: 'Ramadan Umrah 2026',
        description: 'Premium package',
      });
      expect(url).toMatch(/^https:\/\/t\.me\/share\/url\?/);
      const params = new URLSearchParams(url.split('?')[1]!);
      expect(params.get('url')).toBe(
        'https://kafitour.com/packages/ramadan-2026',
      );
      expect(params.get('text')).toBe('Ramadan Umrah 2026 — Premium package');
    });
  });

  describe('smsShareUrl', () => {
    it('builds a correctly encoded SMS share URL', () => {
      const url = smsShareUrl({
        url: 'https://kafitour.com/packages/ramadan-2026',
        title: 'Ramadan Umrah 2026',
      });
      expect(url).toMatch(/^sms:\?&body=/);
      const body = decodeURIComponent(url.split('body=')[1]!);
      expect(body).toContain('Ramadan Umrah 2026');
      expect(body).toContain('https://kafitour.com/packages/ramadan-2026');
    });
  });

  describe('canNativeShare', () => {
    it('returns false when navigator.share is not available', () => {
      expect(canNativeShare()).toBe(false);
    });
  });

  describe('copyLink', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('writes the URL to the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      await copyLink('https://kafitour.com/packages/ramadan-2026');
      expect(writeText).toHaveBeenCalledWith(
        'https://kafitour.com/packages/ramadan-2026',
      );
    });

    it('throws when the clipboard API is unavailable', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
      });

      await expect(copyLink('https://example.com')).rejects.toThrow();
    });
  });

  describe('URL encoding edge cases', () => {
    const edgeCaseData = {
      url: 'https://kafitour.com/packages/ramadan-2026',
      title: 'Ramadan Umrah 2026 — Hajj & Umrah Journey',
      description: "Traveler's Guide to Makkah & Madinah — حج و عمرة",
    };

    it('WhatsApp URL encodes spaces, ampersands, apostrophes, and non-ASCII', () => {
      const url = whatsappShareUrl(edgeCaseData);
      const decoded = decodeURIComponent(url.split('?text=')[1]!);
      expect(decoded).toContain('Ramadan Umrah 2026 — Hajj & Umrah Journey');
      expect(decoded).toContain(
        "Traveler's Guide to Makkah & Madinah — حج و عمرة",
      );
      // The encoded form must not contain raw ampersands (they'd break the URL)
      const encoded = url.split('?text=')[1]!;
      expect(encoded).not.toContain('&');
    });

    it('Telegram URL encodes spaces, ampersands, apostrophes, and non-ASCII', () => {
      const url = telegramShareUrl(edgeCaseData);
      const params = new URLSearchParams(url.split('?')[1]!);
      expect(params.get('text')).toContain(
        'Ramadan Umrah 2026 — Hajj & Umrah Journey',
      );
      expect(params.get('text')).toContain("Traveler's Guide");
      expect(params.get('text')).toContain('حج و عمرة');
    });

    it('SMS URL encodes spaces, ampersands, apostrophes, and non-ASCII', () => {
      const url = smsShareUrl(edgeCaseData);
      const decoded = decodeURIComponent(url.split('body=')[1]!);
      expect(decoded).toContain('Ramadan Umrah 2026 — Hajj & Umrah Journey');
      expect(decoded).toContain('حج و عمرة');
    });

    it('handles very long package titles without truncation errors', () => {
      const longTitle = 'A'.repeat(500);
      const url = whatsappShareUrl({
        url: 'https://kafitour.com/test',
        title: longTitle,
      });
      const decoded = decodeURIComponent(url.split('?text=')[1]!);
      expect(decoded).toContain(longTitle);
    });
  });
});
