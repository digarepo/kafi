import { useParams } from 'react-router';
import { TravellerDetailPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Traveller detail | Kafi Admin' }];
}

export default function TravellerDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing traveller id');
  return <TravellerDetailPage id={id} />;
}
