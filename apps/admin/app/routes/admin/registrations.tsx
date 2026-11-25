import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Registrations | Kafi Admin' }];
}


export default function RegistrationsLayout() {
  return (
    <RequirePermission permission="REGISTRATION_VIEW">
      <Outlet />
    </RequirePermission>
  );
}
