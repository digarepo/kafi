export interface PackageItinerary {
  phase: string;
  title: string;
  description: string;
}

export interface PackageItem {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: string;
  duration: string;
  groupSize: string;
  badge?: string;
  popular?: boolean;
  description: string;
  highlights: string[];
  idealFor: string;
  experience: string;
  itinerary: PackageItinerary[];
}
