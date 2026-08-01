import type { DateRange } from 'react-day-picker';

import type {
  PackageCategory,
  PackageTemplate,
  PackageVersion,
  PackageVersionInclusion,
} from '../../../lib/api.js';

export type PackageFormMode = 'create' | 'edit';

export interface PackageTemplateFormValues {
  name: string;
  short_name: string;
  description: string;
  pilgrimage_type_id: string;
  package_category_id: string;
  default_duration_days: number;
}

export interface PackageTemplateFormOutput {
  name: string;
  short_name?: string;
  description?: string;
  pilgrimage_type_id: string;
  package_category_id: string;
  default_duration_days: number;
}

export interface PackageTemplateFormProps {
  mode: PackageFormMode;
  template?: PackageTemplate | null;
  categories: PackageCategory[];
  pilgrimageTypes: { id: string; name: string }[];
  onSubmit: (values: PackageTemplateFormOutput) => Promise<void>;
  submitLabel?: string;
}

export interface PackageVersionFormValues {
  package_template_id: string;
  version_name: string;
  slug: string;
  hero_image_url: string;
  sort_order: number;
  season_id: string;
  year: number;
  travelRange?: DateRange;
  salesRange?: DateRange;
  base_price: number;
  currency_id: string;
  max_capacity?: number;
  inclusions: PackageVersionInclusion[];
}

export interface PackageVersionFormOutput {
  package_template_id?: string;
  version_name: string;
  slug: string;
  hero_image_url: string;
  sort_order: number;
  season_id?: string;
  year: number;
  departure_date?: string;
  return_date?: string;
  base_price?: number;
  currency_id?: string;
  max_capacity?: number;
  sales_start_date?: string;
  sales_end_date?: string;
  inclusions: PackageVersionInclusion[];
}

export interface PackageVersionFormProps {
  mode: PackageFormMode;
  version?: PackageVersion | null;
  templates: PackageTemplate[];
  currencies: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  onSubmit: (values: PackageVersionFormOutput) => Promise<void>;
  submitLabel?: string;
}
