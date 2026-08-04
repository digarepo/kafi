import { ContactListPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Contact persons | Kafi Admin' }];
}

export default function ContactPersonsIndexRoute() {
  return <ContactListPage />;
}
