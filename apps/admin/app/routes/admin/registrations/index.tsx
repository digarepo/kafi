import { RegistrationListPage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Registrations | Kafi Admin' }];
}

export default function RegistrationsIndexRoute() {
  return <RegistrationListPage />;
}
