import { FlightBookingDetailPage } from '../../../features/flights/index';

export default function FlightBookingDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  return <FlightBookingDetailPage id={params.id} />;
}
