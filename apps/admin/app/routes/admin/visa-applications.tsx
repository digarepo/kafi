import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Visa applications | Kafi Admin' }];
}


export default function VisaApplicationsLayout() {
  return (
    <RequirePermission permission="VISA_VIEW">
      <Outlet />
    </RequirePermission>
  );
}
