import { FinanceExceptionCreatePage } from '@/features/finance';

export function meta() {
  return [{ title: 'Authorize credit | Kafi Admin' }];
}

export default function FinanceExceptionNewRoute() {
  return <FinanceExceptionCreatePage />;
}
