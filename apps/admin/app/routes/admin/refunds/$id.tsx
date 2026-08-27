import { useParams } from 'react-router';
import { RefundDetailPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Refund detail | Kafi Admin' }];
}

export default function RefundDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing refund id');
  return <RefundDetailPage id={id} />;
}
