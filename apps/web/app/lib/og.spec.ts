import { describe, it, expect } from 'vitest';
import { buildOgMeta, ogImageUrlForPackage, SITE_URL } from './og';

describe('og', () => {
  describe('buildOgMeta', () => {
    it('returns a complete set of OG + Twitter meta tags', () => {
      const meta = buildOgMeta({
        title: 'Ramadan Umrah 2026 | Kafi Tours',
        description: 'Premium Umrah package from Addis Ababa.',
        url: 'https://kafitour.com/packages/ramadan-2026',
      });

      const keys = meta.map((m) => m.property ?? m.name);
      expect(keys).toContain('og:type');
      expect(keys).toContain('og:title');
      expect(keys).toContain('og:description');
      expect(keys).toContain('og:url');
      expect(keys).toContain('og:site_name');
      expect(keys).toContain('og:image');
      expect(keys).toContain('og:image:alt');
      expect(keys).toContain('og:locale');
      expect(keys).toContain('twitter:card');
      expect(keys).toContain('twitter:title');
      expect(keys).toContain('twitter:description');
      expect(keys).toContain('twitter:image');
      expect(keys).toContain('twitter:site');
    });

    it('uses the provided title and description', () => {
      const meta = buildOgMeta({
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://kafitour.com/test',
      });

      const ogTitle = meta.find((m) => m.property === 'og:title');
      expect(ogTitle?.content).toBe('Test Title');
      const twitterTitle = meta.find((m) => m.name === 'twitter:title');
      expect(twitterTitle?.content).toBe('Test Title');
    });

    it('uses the provided image when given', () => {
      const customImage = 'https://example.com/custom.png';
      const meta = buildOgMeta({
        title: 'Test',
        description: 'Test',
        url: 'https://kafitour.com/test',
        image: customImage,
      });

      const ogImage = meta.find((m) => m.property === 'og:image');
      expect(ogImage?.content).toBe(customImage);
      const twitterImage = meta.find((m) => m.name === 'twitter:image');
      expect(twitterImage?.content).toBe(customImage);
    });

    it('defaults to summary_large_image twitter card', () => {
      const meta = buildOgMeta({
        title: 'Test',
        description: 'Test',
        url: 'https://kafitour.com/test',
      });
      const card = meta.find((m) => m.name === 'twitter:card');
      expect(card?.content).toBe('summary_large_image');
    });
  });

  describe('ogImageUrlForPackage', () => {
    it('builds the correct OG image URL for a package slug', () => {
      const url = ogImageUrlForPackage('ramadan-2026');
      expect(url).toMatch(/\/api\/public\/og\/packages\/ramadan-2026\.png$/);
    });
  });

  describe('SITE_URL', () => {
    it('is the production site URL', () => {
      expect(SITE_URL).toBe('https://kafitour.com');
    });
  });
});
