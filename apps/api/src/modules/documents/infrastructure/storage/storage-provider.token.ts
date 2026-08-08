/**
 * Injection token and interface for document file storage.
 *
 * Only `LocalStorageProvider` is implemented in Slice 7; an S3-compatible
 * provider can be added in a later slice.
 */
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  /**
   * Persist a file and return the storage key/path.
   */
  save(file: Buffer, key: string): Promise<string>;

  /**
   * Read a previously stored file by key.
   */
  read(key: string): Promise<Buffer>;
}
