import { ContactCreatePage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Create contact person | Kafi Admin' }];
}

export default function ContactPersonNewRoute() {
  return <ContactCreatePage />;
}
