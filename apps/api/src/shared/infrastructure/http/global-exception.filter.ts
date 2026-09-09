import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Converts unexpected server failures into safe API responses.
 *
 * @remarks
 * Expected HTTP exceptions retain their public message. Unexpected failures
 * are logged with request context but never expose SQL, filesystem, or driver
 * details to clients.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : body,
      );
      return;
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      `${request.method} ${request.originalUrl}: ${error.message}`,
      error.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected server error occurred. Please try again.',
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
