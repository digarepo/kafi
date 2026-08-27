import { RefundsListPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Refunds | Kafi Admin' }];
}

export default function RefundsIndexRoute() {
  return <RefundsListPage />;
}
