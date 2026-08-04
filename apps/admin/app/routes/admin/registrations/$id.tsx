import { useParams } from 'react-router';
import { RegistrationDetailPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Registration detail | Kafi Admin' }];
}

export default function RegistrationDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing registration id');
  return <RegistrationDetailPage id={id} />;
}
