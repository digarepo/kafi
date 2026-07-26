/**
 * Simple branded string type for typed identifiers.
 *
 * Branded IDs make it impossible to accidentally pass an unrelated UUID string
 * to a function expecting a specific aggregate ID.
 */
export type TypedId<TBrand extends string> = string & { __brand: TBrand };

/**
 * Creates a typed ID from a raw UUID string. Runtime validation is left to the
 * application boundary; this helper only provides type branding.
 *
 * @param value - Raw UUID string.
 * @returns Branded typed ID.
 */
export function createTypedId<TBrand extends string>(value: string): TypedId<TBrand> {
  return value as TypedId<TBrand>;
}
