import { ExpensesListPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Expenses | Kafi Admin' }];
}

export default function ExpensesIndexRoute() {
  return <ExpensesListPage />;
}
