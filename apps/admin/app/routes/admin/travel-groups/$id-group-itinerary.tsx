import { useParams } from 'react-router';
import { GroupItineraryPage } from '@/features/travel-documents';

export function meta() {
  return [{ title: 'Group itinerary | Kafi Admin' }];
}

export default function GroupItineraryRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing travel group id');
  return <GroupItineraryPage groupId={id} />;
}
