import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as argon2 from 'argon2';

/**
 * Service responsible for password hashing and verification using Argon2id.
 */
@Injectable()
export class PasswordService {
  /**
   * Hashes a plain-text password.
   *
   * @param plain - Plain-text password.
   * @returns Argon2id hash.
   */
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  /**
   * Verifies a plain-text password against an Argon2id hash.
   *
   * @param hash - Stored Argon2id hash.
   * @param plain - Plain-text password to verify.
   * @returns True when the password matches.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  /**
   * Generates a random temporary password suitable for newly created users.
   *
   * @returns Random 16-character password.
   */
  generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from(
      { length: 16 },
      () => chars[randomInt(chars.length)],
    ).join('');
  }
}
