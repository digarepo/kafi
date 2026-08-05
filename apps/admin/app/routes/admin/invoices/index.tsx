import { InvoicesListPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Invoices | Kafi Admin' }];
}

export default function InvoicesIndexRoute() {
  return <InvoicesListPage />;
}
