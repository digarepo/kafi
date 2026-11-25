import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Flight bookings | Kafi Admin' }];
}


export default function FlightBookingsLayout() {
  return (
    <RequirePermission permission="FLIGHT_VIEW">
      <Outlet />
    </RequirePermission>
  );
}
