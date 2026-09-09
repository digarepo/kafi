import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() { return [{ title: 'Travel rounds | Kafi Admin' }]; }
export default function TravelRoundsLayout() { return <RequirePermission permission="TRAVEL_ROUND_VIEW"><Outlet /></RequirePermission>; }
