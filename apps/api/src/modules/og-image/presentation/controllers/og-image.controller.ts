import {
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';

import { OgImageService } from '../../application/services/og-image.service.js';

/**
 * Dynamic Open Graph image generation for public content.
 *
 * @remarks
 * - Returns a 1200×630 PNG suitable for social media cards.
 * - No authentication required — only public/published data is used.
 * - Results are cached server-side (in-memory, 24h TTL) and the response
 *   includes `Cache-Control` headers for CDN/browser caching.
 */
@Controller('public/og')
export class OgImageController {
  private readonly logger = new Logger(OgImageController.name);

  constructor(private readonly ogImage: OgImageService) {}

  /**
   * Generates an OG image for a published package.
   *
   * @param slug - The package version slug.
   * @param res - Express response.
   */
  @Get('packages/:slug.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  async packageImage(
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const png = await this.ogImage.generatePackageImage(slug);
      res.end(png);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `OG image generation failed for slug "${slug}": ${message}`,
      );

      // NotFoundException is thrown by the packages service for unknown slugs.
      // Re-throw it so NestJS returns a proper 404.
      if (message.includes('not found') || message.includes('Not Found')) {
        res.status(404).end();
        return;
      }
      // Font loading or rendering failure — 503 with no body.
      throw new ServiceUnavailableException('OG image generation failed');
    }
  }
}
