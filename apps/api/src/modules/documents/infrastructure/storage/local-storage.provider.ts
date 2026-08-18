import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { StorageProvider } from "./storage-provider.token.js";

/**
 * Local filesystem implementation of StorageProvider.
 *
 * Files are stored under `storage/documents/` by default, or under the
 * directory given by `DOCUMENT_STORAGE_PATH`.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = process.env.DOCUMENT_STORAGE_PATH ?? "storage/documents";
  }

  async save(file: Buffer, key: string): Promise<string> {
    const dir = path.resolve(this.baseDir);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.resolve(dir, key);
    if (fullPath !== dir && !fullPath.startsWith(`${dir}${path.sep}`)) {
      throw new BadRequestException("Invalid storage path");
    }
    await fs.writeFile(fullPath, file);
    return key;
  }

  async read(key: string): Promise<Buffer> {
    const dir = path.resolve(this.baseDir);
    const fullPath = path.resolve(dir, key);
    if (fullPath !== dir && !fullPath.startsWith(`${dir}${path.sep}`)) {
      throw new BadRequestException("Invalid storage path");
    }
    try {
      return await fs.readFile(fullPath);
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        throw new NotFoundException("File not found");
      }
      throw error;
    }
  }
}
