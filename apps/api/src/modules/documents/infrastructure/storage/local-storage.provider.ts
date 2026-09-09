import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StorageProvider } from './storage-provider.token.js';

/**
 * Local filesystem implementation of StorageProvider.
 *
 * Files are stored under `storage/documents/` by default, or under the
 * directory given by `DOCUMENT_STORAGE_PATH`.
 *
 * Relative paths are resolved differently depending on the deployment:
 * - **Nx monorepo (dev)**: CWD is `apps/api`, so the monorepo root is two
 *   levels up. `storage/documents` resolves to `<monorepo>/storage/documents`.
 * - **Standalone deployment (prod)**: The app folder (e.g. `api.kafitour.com`)
 *   sits directly inside its parent (e.g. `/home/user/`), so storage is one
 *   level up. `storage/documents` resolves to `/home/user/storage/documents`.
 *
 * Use an absolute `DOCUMENT_STORAGE_PATH` to override this behaviour entirely.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;

  constructor() {
    const configured = process.env.DOCUMENT_STORAGE_PATH ?? 'storage/documents';
    if (path.isAbsolute(configured)) {
      this.baseDir = configured;
    } else {
      // Detect Nx monorepo (dev) vs standalone deployment (prod).
      // In the monorepo, CWD is apps/api and nx.json sits two levels up.
      // In a standalone deployment, the app folder is one level below
      // its parent (e.g. /home/user/api.kafitour.com → /home/user/).
      const twoUp = path.resolve(process.cwd(), '..', '..');
      const isMonorepo = existsSync(path.join(twoUp, 'nx.json'));
      this.baseDir = isMonorepo
        ? path.resolve(twoUp, configured)
        : path.resolve(process.cwd(), '..', configured);
    }
    this.logger.log(`Document storage base directory: ${this.baseDir}`);
  }

  async save(file: Buffer, key: string): Promise<string> {
    const dir = path.resolve(this.baseDir);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error: any) {
      this.logger.error(
        `Failed to create storage directory "${dir}": ${error?.message ?? error}`,
      );
      throw error;
    }
    const fullPath = path.resolve(dir, key);
    if (fullPath !== dir && !fullPath.startsWith(`${dir}${path.sep}`)) {
      throw new BadRequestException('Invalid storage path');
    }
    try {
      await fs.writeFile(fullPath, file);
    } catch (error: any) {
      this.logger.error(
        `Failed to write file "${fullPath}": ${error?.message ?? error}`,
      );
      throw error;
    }
    return key;
  }

  async read(key: string): Promise<Buffer> {
    const dir = path.resolve(this.baseDir);
    const fullPath = path.resolve(dir, key);
    if (fullPath !== dir && !fullPath.startsWith(`${dir}${path.sep}`)) {
      throw new BadRequestException('Invalid storage path');
    }
    try {
      return await fs.readFile(fullPath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }
}
