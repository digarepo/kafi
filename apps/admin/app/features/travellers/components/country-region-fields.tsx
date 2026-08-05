/**
 * Reusable country + dependent region fields.
 *
 * @remarks
 * - Ethiopia is resolved as the default for new records via the shared
 *   `getDefaultCountryId` helper, but this component itself only renders the
 *   fields and manages region loading; the default is set by the parent form
 *   during default-value construction.
 * - Region options are fetched from `api.listRegions(countryId)` whenever the
 *   selected country changes.
 * - The region selection is cleared when the country changes.
 */

import { useEffect, useState } from 'react';
import { AnyFieldApi, useSelector } from '@tanstack/react-form';

import { Label } from '@kafi/ui';

import { api } from '../../../lib/api';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from './lookup-select';
import type { Country, Region } from '../../../lib/api.js';

interface CountryRegionFieldsProps {
  /**
   * TanStack Form instance for the parent form.
   *
   * @remarks
   * Typed as `any` because TanStack Form's `FormApi` has too many generic
   * parameters to be usefully constrained here; the component only depends
   * on the `Field` JSX component, `setFieldValue`, and `store`, which are
   * always present on instances produced by `useForm`.
   */
  form: any;

  /** Countries loaded from the reference data API. */
  countries: Country[];
}

/**
 * Render the country and region select fields with dependent loading.
 *
 * @param props - See {@link CountryRegionFieldsProps}.
 * @returns The country and region field elements.
 */
export function CountryRegionFields({
  form,
  countries,
}: CountryRegionFieldsProps) {
  const country_id = useSelector(
    form.store,
    (state: any) => state.values.country_id as string,
  );
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);

  useEffect(() => {
    if (!country_id) {
      setRegions([]);
      setRegionsLoading(false);
      return;
    }
    let cancelled = false;
    setRegionsLoading(true);
    api
      .listRegions(country_id)
      .then((r) => {
        if (!cancelled) setRegions(r);
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country_id]);

  return (
    <>
      <form.Field name="country_id">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Country</Label>
            <LookupSelect
              value={field.state.value}
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select country"
              onChange={(value) => {
                field.handleChange(value);
                form.setFieldValue('region_id', '');
              }}
              aria-invalid={field.state.meta.errors.length > 0}
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>

      <form.Field name="region_id">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Region</Label>
            <LookupSelect
              value={field.state.value}
              options={regions.map((r) => ({ value: r.id, label: r.name }))}
              placeholder={
                regionsLoading
                  ? 'Loading regions…'
                  : !country_id
                    ? 'Select a country first'
                    : regions.length === 0
                      ? 'No regions available'
                      : 'Select region'
              }
              onChange={(value) => field.handleChange(value)}
              disabled={regionsLoading || regions.length === 0}
            />
          </div>
        )}
      </form.Field>
    </>
  );
}
