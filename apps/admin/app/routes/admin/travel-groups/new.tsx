import { TravelGroupCreatePage } from '@/features/operations';

export function meta() {
  return [{ title: 'Create travel group | Kafi Admin' }];
}

export default function TravelGroupNewRoute() {
  return <TravelGroupCreatePage />;
}
