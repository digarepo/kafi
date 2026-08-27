import { RefundCreatePage } from '@/features/finance';

export function meta() {
  return [{ title: 'Create refund | Kafi Admin' }];
}

export default function RefundNewRoute() {
  return <RefundCreatePage />;
}
