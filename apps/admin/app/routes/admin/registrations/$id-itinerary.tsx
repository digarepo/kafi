import { useParams } from 'react-router';
import { TravelerItineraryPage } from '@/features/travel-documents';

export function meta() {
  return [{ title: 'Traveler itinerary | Kafi Admin' }];
}

export default function TravelerItineraryRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing registration id');
  return <TravelerItineraryPage registrationId={id} />;
}
