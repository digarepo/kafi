import { Controller, Get, Inject, Res } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { Response } from 'express';
import * as schema from '@kafi/database';
import { DATABASE } from '../shared/infrastructure/database/database.provider.js';

@Controller()
export class AppController {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}
  @Get()
  getRoot() {
    return {
      name: 'API',
      version: '1.0.0',
      status: 'operational',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok!',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/live')
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/ready')
  async getReadiness(@Res() response: Response) {
    try {
      await this.db.execute(sql`select 1`);
      return response.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch {
      return response.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
