import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for domain-level errors. Carries a human-readable message and
 * an optional HTTP status code.
 */
export class DomainException extends HttpException {
  /**
   * @param message - Human-readable error message.
   * @param status - HTTP status code; defaults to 400 Bad Request.
   */
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message }, status);
  }
}
