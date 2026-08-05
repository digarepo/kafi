import { useParams } from 'react-router';
import { InvoiceDetailPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Invoice detail | Kafi Admin' }];
}

export default function InvoiceDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing invoice id');
  return <InvoiceDetailPage id={id} />;
}
