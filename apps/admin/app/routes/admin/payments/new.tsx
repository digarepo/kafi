import { PaymentCreatePage } from '@/features/finance';

export function meta() {
  return [{ title: 'Record payment | Kafi Admin' }];
}

export default function PaymentCreateRoute() {
  return <PaymentCreatePage />;
}
