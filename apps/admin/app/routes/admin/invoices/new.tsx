import { InvoiceCreatePage } from '@/features/finance';

export function meta() {
  return [{ title: 'Create invoice | Kafi Admin' }];
}

export default function InvoiceCreateRoute() {
  return <InvoiceCreatePage />;
}
