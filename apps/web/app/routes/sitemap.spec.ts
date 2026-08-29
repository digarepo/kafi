import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the public-api module so we can control which packages appear.
vi.mock('@/lib/public-api', () => ({
  listPublicPackages: vi.fn(),
}));

// Mock the services data so we have deterministic service slugs.
vi.mock('@/features/services/data/services', () => ({
  services: [
    { slug: 'visa-processing' },
    { slug: 'ticketing' },
    { slug: 'accommodation' },
    { slug: 'ground-transport' },
    { slug: 'guided-tours' },
    { slug: 'scholarly-guidance' },
  ],
}));

import { listPublicPackages } from '@/lib/public-api';

// Import the loader dynamically after mocks are in place.
import { loader } from './sitemap';

describe('sitemap.xml resource route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns valid XML with correct Content-Type', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({ data: [], total: 0 });

    const response = await loader({} as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/xml; charset=utf-8',
    );
    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml.endsWith('</urlset>')).toBe(true);
  });

  it('includes all static indexable pages', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({ data: [], total: 0 });

    const xml = await (await loader({} as any)).text();

    expect(xml).toContain('https://kafitour.com/');
    expect(xml).toContain('https://kafitour.com/packages');
    expect(xml).toContain('https://kafitour.com/services');
    expect(xml).toContain('https://kafitour.com/about');
    expect(xml).toContain('https://kafitour.com/contact');
    expect(xml).toContain('https://kafitour.com/faq');
    expect(xml).toContain('https://kafitour.com/privacy');
    expect(xml).toContain('https://kafitour.com/tos');
  });

  it('includes all service detail URLs', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({ data: [], total: 0 });

    const xml = await (await loader({} as any)).text();

    expect(xml).toContain('https://kafitour.com/services/visa-processing');
    expect(xml).toContain('https://kafitour.com/services/ticketing');
    expect(xml).toContain('https://kafitour.com/services/accommodation');
    expect(xml).toContain('https://kafitour.com/services/ground-transport');
    expect(xml).toContain('https://kafitour.com/services/guided-tours');
    expect(xml).toContain('https://kafitour.com/services/scholarly-guidance');
  });

  it('includes published package URLs with lastmod from published_at', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({
      data: [
        {
          slug: 'economy-umrah-ramadan-2027',
          published_at: '2026-08-15T10:00:00.000Z',
        },
        {
          slug: 'premium-umrah-ramadan-2027',
          published_at: '2026-08-20T12:00:00.000Z',
        },
      ] as any,
      total: 2,
    });

    const xml = await (await loader({} as any)).text();

    expect(xml).toContain(
      'https://kafitour.com/packages/economy-umrah-ramadan-2027',
    );
    expect(xml).toContain(
      'https://kafitour.com/packages/premium-umrah-ramadan-2027',
    );
    expect(xml).toContain('<lastmod>2026-08-15</lastmod>');
    expect(xml).toContain('<lastmod>2026-08-20</lastmod>');
  });

  it('omits lastmod when published_at is null', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({
      data: [
        {
          slug: 'test-package',
          published_at: null,
        },
      ] as any,
      total: 1,
    });

    const xml = await (await loader({} as any)).text();

    expect(xml).toContain('https://kafitour.com/packages/test-package');
    expect(xml).not.toContain('<lastmod>');
  });

  it('excludes booking, callback, and enquiry (form pages)', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({ data: [], total: 0 });

    const xml = await (await loader({} as any)).text();

    expect(xml).not.toContain('https://kafitour.com/booking');
    expect(xml).not.toContain('https://kafitour.com/callback');
    expect(xml).not.toContain('https://kafitour.com/enquiry');
  });

  it('still returns static URLs when the API is unreachable', async () => {
    vi.mocked(listPublicPackages).mockRejectedValue(new Error('API down'));

    const response = await loader({} as any);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain('https://kafitour.com/');
    expect(xml).toContain('https://kafitour.com/packages');
    expect(xml).toContain('https://kafitour.com/services');
  });

  it('produces parseable XML', async () => {
    vi.mocked(listPublicPackages).mockResolvedValue({
      data: [
        {
          slug: 'test-package',
          published_at: '2026-08-15T10:00:00.000Z',
        },
      ] as any,
      total: 1,
    });

    const xml = await (await loader({} as any)).text();

    // Use DOMParser to verify the XML is well-formed.
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    expect(parseError).toBeNull();

    const urls = doc.querySelectorAll('url');
    // 8 static + 1 package + 6 services = 15
    expect(urls.length).toBe(15);
  });
});
