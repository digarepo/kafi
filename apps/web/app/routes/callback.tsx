import type { Route } from "./+types/callback";
import { CallbackPage } from "@/features/callback";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Request a Callback | Kafi Tours" },
    {
      name: "description",
      content:
        "Request a callback from Kafi Tours. A representative will contact you to answer your questions or guide you through the booking process.",
    },
  ];
}

export default function CallbackRoute() {
  return <CallbackPage />;
}
