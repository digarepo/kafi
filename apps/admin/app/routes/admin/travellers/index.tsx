import { TravellerListPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Travellers | Kafi Admin' }];
}

export default function TravellersIndexRoute() {
  return <TravellerListPage />;
}
