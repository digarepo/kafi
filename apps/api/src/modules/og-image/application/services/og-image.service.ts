import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PackagesService } from '../../../packages/application/services/packages.service.js';

/**
 * Lazy-loaded satori and resvg modules.
 *
 * These packages use native binaries (@resvg/resvg-js) that may fail to load
 * on certain server architectures. By importing them lazily, the API can
 * start successfully even if the OG image renderer is unavailable — only
 * actual OG image requests will fail (with a logged error), not the entire
 * application.
 */
let satoriFn: typeof import('satori').default | null = null;
let ResvgClass: typeof import('@resvg/resvg-js').Resvg | null = null;

async function loadSatori() {
  if (!satoriFn) {
    const mod = await import('satori');
    satoriFn = mod.default;
  }
  return satoriFn;
}

async function loadResvg() {
  if (!ResvgClass) {
    const mod = await import('@resvg/resvg-js');
    ResvgClass = mod.Resvg;
  }
  return ResvgClass;
}

/**
 * Resolves the font path relative to this source file.
 *
 * In dev: `src/modules/og-image/application/services/og-image.service.ts`
 *   → `src/assets/inter-700.woff2`
 * In prod: `dist/modules/og-image/application/services/og-image.service.js`
 *   → `dist/assets/inter-700.woff2` (copied by nest-cli.json assets config)
 *
 * This is deployment-safe: the font travels with the API build output and
 * does not depend on the web app's public directory or a monorepo-relative
 * path. The `OG_IMAGE_FONT_PATH` env var can override this for custom
 * deployments.
 */
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FONT_PATH = join(
  MODULE_DIR,
  '..',
  '..',
  '..',
  '..',
  'assets',
  'inter-700.ttf',
);

/**
 * OG image dimensions (standard social card size).
 */
const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Cache entry for a generated OG image.
 *
 * @remarks
 * This is a simple in-memory cache compatible with the current single-instance
 * deployment. It is NOT a distributed cache. The cache is bounded to a
 * maximum number of entries with LRU-style eviction (oldest entries dropped
 * first). Each entry has a TTL after which the image is regenerated.
 */
interface CacheEntry {
  png: Buffer;
  expiresAt: number;
}

const MAX_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates dynamic Open Graph images for public content.
 *
 * @remarks
 * - Uses `satori` to render HTML/CSS to an SVG, then `@resvg/resvg-js` to
 *   rasterize to PNG.
 * - The generated image is 1200×630 (standard OG image size).
 * - Results are cached in-memory (bounded LRU, 24h TTL) to avoid regenerating
 *   the same image repeatedly.
 * - Only public/published package data is used — no private/admin data.
 */
@Injectable()
export class OgImageService {
  private readonly logger = new Logger(OgImageService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private fontData: ArrayBuffer | null = null;

  constructor(private readonly packages: PackagesService) {}

  /**
   * Generates an OG image PNG for a published package.
   *
   * @param slug - The package version slug.
   * @returns PNG image buffer.
   * @throws NotFoundException if the package is not found or not published.
   */
  async generatePackageImage(slug: string): Promise<Buffer> {
    const cacheKey = `package:${slug}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const pkg = await this.packages.getPublicPackageBySlug(slug);

    const name =
      (pkg.package_template?.name ?? pkg.version_name).split(' ')[0] ??
      pkg.version_name;
    const season = pkg.season?.name ?? String(pkg.year);
    const price = new Intl.NumberFormat('en-US').format(pkg.base_price);
    const currency = pkg.currency?.code ?? '';
    const category = pkg.package_category?.name ?? 'Umrah';

    const svg = await this.renderSvg({
      title: `${name} Umrah`,
      subtitle: `${season} · ${currency} ${price}`,
      category,
      heroImageUrl: pkg.hero_image_url ?? null,
    });

    const png = await this.rasterize(svg);
    this.setInCache(cacheKey, png);
    return png;
  }

  /**
   * Renders the OG image template to an SVG string using satori.
   */
  private async renderSvg(input: {
    title: string;
    subtitle: string;
    category: string;
    heroImageUrl: string | null;
  }): Promise<string> {
    const fontData = await this.loadFont();
    const satori = await loadSatori();

    return satori(
      {
        type: 'div',
        props: {
          style: {
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 60,
            backgroundColor: '#0a1f1c',
            backgroundImage: input.heroImageUrl
              ? `url(${input.heroImageUrl})`
              : 'linear-gradient(135deg, #0a1f1c 0%, #1a3d38 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#ffffff',
            fontFamily: 'Inter',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(10, 31, 28, 0.85)',
                  width: '100%',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#c9a96e',
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                      },
                      children: `Kafi Tours · ${input.category}`,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 56,
                        fontWeight: 700,
                        lineHeight: 1.1,
                      },
                      children: input.title,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 28,
                        fontWeight: 400,
                        color: '#a0c4bd',
                      },
                      children: input.subtitle,
                    },
                  },
                ],
              },
            },
          ],
        },
      } as any,
      {
        width: WIDTH,
        height: HEIGHT,
        fonts: [
          { name: 'Inter', data: fontData, weight: 700, style: 'normal' },
        ],
      },
    );
  }

  /**
   * Rasterizes an SVG string to a PNG buffer using resvg.
   */
  private async rasterize(svg: string): Promise<Buffer> {
    const Resvg = await loadResvg();
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: WIDTH },
    });
    const rendered = resvg.render();
    return rendered.asPng();
  }

  /**
   * Loads the font data once and caches it for the process lifetime.
   */
  private async loadFont(): Promise<ArrayBuffer> {
    if (this.fontData) return this.fontData;
    const fontPath = process.env['OG_IMAGE_FONT_PATH'] ?? DEFAULT_FONT_PATH;
    try {
      const data = await readFile(fontPath);
      this.fontData = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer;
      return this.fontData;
    } catch (error) {
      this.logger.error(
        `Failed to load OG image font from ${fontPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Retrieves a cached entry if it exists and has not expired.
   */
  private getFromCache(key: string): Buffer | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.png;
  }

  /**
   * Stores a PNG in the cache with a TTL. Evicts the oldest entry if the
   * cache is full.
   */
  private setInCache(key: string, png: Buffer): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { png, expiresAt: Date.now() + CACHE_TTL_MS });
  }
}
