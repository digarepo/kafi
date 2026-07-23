import { AboutPage } from "@/features/about";

import { type Route } from "./+types/about";

/**
 * Route metadata for the about page.
 *
 * @param _args - React Router meta arguments.
 * @returns The page title and description tags.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: "About Kafi Tours" },
    {
      name: "description",
      content: "Learn about Kafi Tours — an Ethiopian Umrah operator serving pilgrims since 2014.",
    },
  ];
}

/**
 * Renders the about route.
 *
 * @returns The about page component.
 */
export default function AboutRoute() {
  return <AboutPage />;
}
