import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { PackagesModule } from '../packages/packages.module.js';
import { OgImageService } from './application/services/og-image.service.js';
import { OgImageController } from './presentation/controllers/og-image.controller.js';

/**
 * OG image bounded context: dynamic Open Graph image generation.
 *
 * @remarks
 * - Uses `satori` + `@resvg/resvg-js` to render 1200×630 PNGs from public
 *   content data.
 * - Imports `PackagesModule` to resolve published packages by slug.
 * - No authentication — only public data is exposed.
 */
@Module({
  imports: [SharedModule, PackagesModule],
  controllers: [OgImageController],
  providers: [OgImageService],
})
export class OgImageModule {}
