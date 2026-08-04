import { RegistrationCreatePage } from '@/features/travellers';

export function meta() {
  return [{ title: 'Create registration | Kafi Admin' }];
}

export default function RegistrationNewRoute() {
  return <RegistrationCreatePage />;
}
