/**
 * Helpers for working with the countries reference data.
 *
 * @remarks
 * - Ethiopia is the default country for new records that don't already have
 *   an explicit country selected.
 * - The ISO code is used to resolve the default so the actual database id is
 *   never hardcoded.
 */

import type { Country } from '../../../lib/api.js';

/** ISO code used to identify Ethiopia as the default country. */
export const DEFAULT_COUNTRY_ISO_CODE = 'ET';

/**
 * Resolve the default country id to preselect on create forms.
 *
 * @param countries - The countries loaded from the reference data API.
 * @param existing - The existing country id, if any (e.g. from an edit record).
 * @param mode - Whether the form is creating or editing a record.
 * @returns Ethiopia's id if no country is selected and the form is in create
 *   mode, otherwise the existing id or an empty string.
 */
export function getDefaultCountryId(
  countries: Country[],
  existing?: string,
  mode: 'create' | 'edit' = 'create',
): string {
  if (mode === 'edit') {
    return existing ?? '';
  }
  if (existing) {
    return existing;
  }
  return (
    countries.find((c) => c.iso_code === DEFAULT_COUNTRY_ISO_CODE)?.id ?? ''
  );
}
