import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { SharedModule } from '../shared/shared.module.js';
import { IAMModule } from '../modules/iam/iam.module.js';

@Module({
  imports: [SharedModule, IAMModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
