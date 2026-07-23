import type { Route } from "./+types/booking";
import { BookingPage } from "@/features/booking";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Booking Request | Kafi Tours" },
    {
      name: "description",
      content:
        "Submit a booking request for your Umrah journey. A Kafi travel coordinator will confirm availability and guide you through the next steps.",
    },
  ];
}

export default function BookingRoute() {
  return <BookingPage />;
}
