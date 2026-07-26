import { z } from 'zod';

/**
 * Static schema marker attached to DTO classes generated from Zod schemas.
 */
export interface ZodDtoStatic<TSchema extends z.ZodTypeAny> {
  schema: TSchema;
}

/**
 * Creates a NestJS-compatible DTO class from a Zod v4 schema.
 *
 * The returned class can be used as a controller parameter type while the
 * static `schema` property is consumed by the ZodValidationPipe.
 *
 * @param schema - Zod schema.
 * @returns Class constructor with a static schema property.
 */
export function createZodDto<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  class ZodDtoClass {
    static schema = schema;
  }

  return ZodDtoClass as unknown as {
    new (): z.infer<TSchema>;
  } & ZodDtoStatic<TSchema>;
}
