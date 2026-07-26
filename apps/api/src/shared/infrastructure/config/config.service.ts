import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { AppConfig } from './config.schema.js';

/**
 * Thin wrapper over @nestjs/config that exposes the validated AppConfig shape.
 */
@Injectable()
export class ConfigService {
  constructor(private readonly nestConfig: NestConfigService<AppConfig, true>) {}

  /**
   * Returns the validated configuration value for a given key.
   *
   * @param key - Configuration key.
   * @returns Typed configuration value.
   */
  get<TKey extends keyof AppConfig>(key: TKey): AppConfig[TKey] {
    return this.nestConfig.get(key, { infer: true }) as AppConfig[TKey];
  }

  /**
   * Returns true when running in a production-like environment.
   */
  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}
