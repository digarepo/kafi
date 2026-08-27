import { FinanceExceptionsListPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Finance Exceptions | Kafi Admin' }];
}

export default function FinanceExceptionsIndexRoute() {
  return <FinanceExceptionsListPage />;
}
