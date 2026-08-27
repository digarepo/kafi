import { useParams } from 'react-router';
import { CreditExceptionRequestDetailPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Credit exception request detail | Kafi Admin' }];
}

export default function CreditExceptionRequestDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing credit exception request id');
  return <CreditExceptionRequestDetailPage id={id} />;
}
