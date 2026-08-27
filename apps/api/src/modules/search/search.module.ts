import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { SearchService } from './application/services/search.service.js';
import { AdminSearchController } from './presentation/controllers/admin-search.controller.js';

@Module({
  imports: [SharedModule],
  providers: [SearchService],
  controllers: [AdminSearchController],
})
export class SearchModule {}
