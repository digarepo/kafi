import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { StorageProvider } from './storage-provider.token.js';

/**
 * Local filesystem implementation of StorageProvider.
 *
 * Files are stored under `storage/documents/` by default, or under the
 * directory given by `DOCUMENT_STORAGE_PATH`.
 *
 * Relative paths are resolved from the monorepo root (two levels up
 * from the API working directory) so that
 * `DOCUMENT_STORAGE_PATH=storage/documents` points to a top-level
 * `storage/` folder at the repo root in the Nx monorepo
 * (`apps/api` → `../../storage/documents`). In a standalone deployment
 * where the api folder sits directly next to `storage/`, set
 * `DOCUMENT_STORAGE_PATH` to an absolute path. Use an absolute path to
 * override this behaviour entirely.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor() {
    const configured = process.env.DOCUMENT_STORAGE_PATH ?? 'storage/documents';
    if (path.isAbsolute(configured)) {
      this.baseDir = configured;
    } else {
      // The API process CWD is apps/api in the monorepo. Resolve
      // relative paths from the monorepo root (two levels up) so they
      // point to a top-level storage folder.
      this.baseDir = path.resolve(process.cwd(), '..', '..', configured);
    }
  }

  async save(file: Buffer, key: string): Promise<string> {
    const dir = path.resolve(this.baseDir);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.resolve(dir, key);
    if (fullPath !== dir && !fullPath.startsWith(`${dir}${path.sep}`)) {
      throw new BadRequestException('Invalid storage path');
    }
    await fs.writeFile(fullPath, file);
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
