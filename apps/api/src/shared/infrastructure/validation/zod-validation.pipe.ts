import {
  BadRequestException,
  Injectable,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { ZodDtoStatic } from './zod-dto.js';

/**
 * Global validation pipe that uses Zod v4 as the single source of truth.
 *
 * DTOs passed to controllers must either be ZodDto classes (with a static
 * `schema` property) or plain Zod schemas.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: { metatype?: Type<unknown> | Function }): unknown {
    if (!metadata.metatype) {
      return value;
    }

    const schema = this.getSchema(metadata.metatype);
    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(this.formatError(result.error));
    }

    return result.data;
  }

  private getSchema(metatype: Type<unknown> | Function): z.ZodTypeAny | undefined {
    const candidate = metatype as unknown as ZodDtoStatic<z.ZodTypeAny>;
    if (candidate.schema) {
      return candidate.schema;
    }

    if (metatype instanceof z.ZodType) {
      return metatype as z.ZodTypeAny;
    }

    return undefined;
  }

  private formatError(error: ZodError): { message: string; errors: z.ZodIssue[] } {
    return {
      message: 'Validation failed',
      errors: error.issues,
    };
  }
}
