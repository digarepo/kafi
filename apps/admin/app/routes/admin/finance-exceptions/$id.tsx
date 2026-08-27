import { useParams } from 'react-router';
import { FinanceExceptionDetailPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Credit exception detail | Kafi Admin' }];
}

export default function FinanceExceptionDetailRoute() {
  const { id } = useParams();
  if (!id) throw new Error('Missing finance exception id');
  return <FinanceExceptionDetailPage id={id} />;
}
