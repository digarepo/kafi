import { CreditExceptionRequestsListPage } from '@/features/finance';

export function meta() {
  return [{ title: 'Credit Exception Requests | Kafi Admin' }];
}

export default function CreditExceptionRequestsIndexRoute() {
  return <CreditExceptionRequestsListPage />;
}
