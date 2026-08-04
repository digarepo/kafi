import { useParams } from 'react-router';
import { ContactDetailPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Contact person detail | Kafi Admin' }];
}

export default function ContactPersonDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing contact person id');
  return <ContactDetailPage id={id} />;
}
