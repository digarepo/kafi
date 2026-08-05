import { PaymentsListPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Payments | Kafi Admin' }];
}

export default function PaymentsIndexRoute() {
  return <PaymentsListPage />;
}
