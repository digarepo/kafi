import { TravellerCreatePage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Create traveller | Kafi Admin' }];
}

export default function TravellerNewRoute() {
  return <TravellerCreatePage />;
}
