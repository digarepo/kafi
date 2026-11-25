import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Documents | Kafi Admin' }];
}


export default function DocumentsLayout() {
  return (
    <RequirePermission permission="DOCUMENT_VIEW">
      <Outlet />
    </RequirePermission>
  );
}
