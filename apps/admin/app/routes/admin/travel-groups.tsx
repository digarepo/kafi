import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Travel groups | Kafi Admin' }];
}


export default function TravelGroupsLayout() {
  return (
    <RequirePermission permission="TRAVEL_GROUP_VIEW">
      <Outlet />
    </RequirePermission>
  );
}
