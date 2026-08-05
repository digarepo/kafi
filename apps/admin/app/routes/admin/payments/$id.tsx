import { useParams } from 'react-router';
import { PaymentDetailPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Payment detail | Kafi Admin' }];
}

export default function PaymentDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing payment id');
  return <PaymentDetailPage id={id} />;
}
