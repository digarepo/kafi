import { ExpenseCreatePage } from '@/features/finance';

export function meta() {
  return [{ title: 'Record expense | Kafi Admin' }];
}

export default function ExpenseCreateRoute() {
  return <ExpenseCreatePage />;
}
