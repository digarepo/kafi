import type { Route } from "./+types/enquiry";
import { EnquiryPage } from "@/features/enquiry";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Enquiry | Kafi Tours" },
    {
      name: "description",
      content:
        "Send an enquiry to Kafi Tours about packages, services, or custom pilgrimage plans. A travel coordinator will respond shortly.",
    },
  ];
}

export default function EnquiryRoute() {
  return <EnquiryPage />;
}
