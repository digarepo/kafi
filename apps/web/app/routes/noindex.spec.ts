import { describe, it, expect } from 'vitest';

import { meta as bookingMeta } from './booking';
import { meta as callbackMeta } from './callback';
import { meta as enquiryMeta } from './enquiry';
import { meta as homeMeta } from './home';
import { meta as packagesMeta } from './packages';
import { meta as aboutMeta } from './about';

describe('noindex metadata', () => {
  it('booking route emits noindex, follow', () => {
    const meta = bookingMeta({} as any);
    const robots = meta.find((m: any) => m.name === 'robots');
    expect(robots).toBeDefined();
    expect((robots as any).content).toBe('noindex, follow');
  });

  it('callback route emits noindex, follow', () => {
    const meta = callbackMeta({} as any);
    const robots = meta.find((m: any) => m.name === 'robots');
    expect(robots).toBeDefined();
    expect((robots as any).content).toBe('noindex, follow');
  });

  it('enquiry route emits noindex, follow', () => {
    const meta = enquiryMeta({} as any);
    const robots = meta.find((m: any) => m.name === 'robots');
    expect(robots).toBeDefined();
    expect((robots as any).content).toBe('noindex, follow');
  });

  it('home route does NOT emit noindex', () => {
    const meta = homeMeta({} as any);
    const robots = meta.find((m: any) => m.name === 'robots');
    expect(robots).toBeUndefined();
  });

  it('packages route does NOT emit noindex', () => {
    const meta = packagesMeta({} as any);
    const robots = meta.find((m: any) => m.name === 'robots');
    expect(robots).toBeUndefined();
  });

  it('about route does NOT emit noindex', () => {
    const meta = aboutMeta({} as any);
    const robots = meta.find((m: any) => m.name === 'robots');
    expect(robots).toBeUndefined();
  });

  it('form routes still have canonical URLs and titles', () => {
    const booking = bookingMeta({} as any);
    const callback = callbackMeta({} as any);
    const enquiry = enquiryMeta({} as any);

    for (const meta of [booking, callback, enquiry]) {
      const title = meta.find((m: any) => 'title' in m);
      expect(title).toBeDefined();
      const canonical = meta.find(
        (m: any) => m.tagName === 'link' && m.rel === 'canonical',
      );
      expect(canonical).toBeDefined();
    }
  });
});
