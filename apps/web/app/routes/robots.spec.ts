import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('robots.txt', () => {
  const robotsPath = join(process.cwd(), 'public', 'robots.txt');
  const content = readFileSync(robotsPath, 'utf-8');

  it('allows all user agents', () => {
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
  });

  it('declares the sitemap URL', () => {
    expect(content).toContain('Sitemap: https://kafitour.com/sitemap.xml');
  });

  it('does not disallow form pages (noindex is handled via meta tags)', () => {
    expect(content).not.toContain('Disallow: /booking');
    expect(content).not.toContain('Disallow: /callback');
    expect(content).not.toContain('Disallow: /enquiry');
  });
});
