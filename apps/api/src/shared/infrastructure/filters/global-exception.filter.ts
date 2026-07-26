import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Global exception filter that normalizes all errors into a JSON response.
 *
 * ZodErrors and HttpExceptions are returned with their original messages.
 * Unknown errors are logged and returned as generic 500 responses.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter<unknown> {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;
        message = (body.message as string) ?? message;
        errors = body.errors;
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = exception.issues;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        message = exception.message;
      }
    } else {
      this.logger.error('Unknown exception', exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors !== undefined && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
