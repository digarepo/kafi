import { FinanceDashboardPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Finance Dashboard | Kafi Admin' }];
}

export default function FinanceDashboardRoute() {
  return <FinanceDashboardPage />;
}
