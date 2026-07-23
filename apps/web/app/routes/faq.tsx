import type { Route } from "./+types/faq";
import FaqPage from "@/features/faq/components/faq-page";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FAQ | Kafi Tours" },
    {
      name: "description",
      content:
        "Find answers to common questions about Kafi Tours Umrah packages, visas, flights, accommodation, and the pilgrimage journey.",
    },
  ];
}

export default function FaqRoute() {
  return <FaqPage />;
}
