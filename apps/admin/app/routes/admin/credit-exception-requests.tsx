import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Credit Exception Requests | Kafi Admin' }];
}


export default function CreditExceptionRequestsLayout() {
  return (
    <RequirePermission permission="FINANCE_VIEW">
      <Outlet />
    </RequirePermission>
  );
}
