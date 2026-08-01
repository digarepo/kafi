const API_BASE = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
})();

export interface PublicPackageVersion {
  id: string;
  package_version_code: string;
  version_name: string;
  version_number: number;
  slug: string;
  hero_image_url: string | null;
  sort_order: number;
  year: number;
  departure_date: string | null;
  return_date: string | null;
  base_price: number;
  max_capacity: number | null;
  published_at: string | null;
  sales_start_date: string | null;
  sales_end_date: string | null;
  status: string;
  status_name: string;
  package_template: { id: string; name: string } | null;
  package_category: { id: string; name: string } | null;
  pilgrimage_type: { id: string; name: string } | null;
  season: { id: string; name: string } | null;
  currency: { id: string; code: string; name: string } | null;
  currency_id: string;
  available_capacity: number | null;
  inclusions: {
    id: string;
    inclusion_text: string;
    display_order: number;
    is_highlighted: boolean;
  }[];
}

export interface PublicPackageFilters {
  category?: string;
  pilgrimageType?: string;
  year?: string;
  search?: string;
}

export async function listPublicPackages(filters: PublicPackageFilters = {}): Promise<{
  data: PublicPackageVersion[];
  total: number;
}> {
  const qs = new URLSearchParams();
  if (filters.category) qs.set('category', filters.category);
  if (filters.pilgrimageType) qs.set('pilgrimageType', filters.pilgrimageType);
  if (filters.year) qs.set('year', filters.year);
  if (filters.search) qs.set('search', filters.search);
  const response = await fetch(`${API_BASE}/api/public/packages?${qs.toString()}`);
  if (!response.ok) throw new Error('Failed to load packages');
  return response.json() as Promise<{ data: PublicPackageVersion[]; total: number }>;
}

export async function getPublicPackage(slug: string): Promise<PublicPackageVersion> {
  const response = await fetch(`${API_BASE}/api/public/packages/${slug}`);
  if (!response.ok) throw new Error('Package not found');
  return response.json() as Promise<PublicPackageVersion>;
}
