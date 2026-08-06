import { TravelGroupListPage } from '@/features/operations';

export function meta() {
  return [{ title: 'Travel groups | Kafi Admin' }];
}

export default function TravelGroupsIndexRoute() {
  return <TravelGroupListPage />;
}
