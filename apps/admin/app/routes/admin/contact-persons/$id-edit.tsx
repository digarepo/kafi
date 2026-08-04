import { useParams } from 'react-router';
import { ContactEditPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Edit contact person | Kafi Admin' }];
}

export default function ContactPersonEditRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing contact person id');
  return <ContactEditPage id={id} />;
}
