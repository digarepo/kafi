import { CreditExceptionRequestCreatePage } from '@/features/finance';

export function meta() {
  return [{ title: 'Request credit exception | Kafi Admin' }];
}

export default function CreditExceptionRequestNewRoute() {
  return <CreditExceptionRequestCreatePage />;
}
