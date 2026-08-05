import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { SharedModule } from '../shared/shared.module.js';
import { IAMModule } from '../modules/iam/iam.module.js';
import { PackagesModule } from '../modules/packages/packages.module.js';
import { TravellersModule } from '../modules/travellers/index.js';
import { FinanceModule } from '../modules/finance/index.js';

@Module({
  imports: [
    SharedModule,
    IAMModule,
    PackagesModule,
    TravellersModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
