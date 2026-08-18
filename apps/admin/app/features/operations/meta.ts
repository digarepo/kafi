/**
 * Route metadata for the operations admin feature.
 *
 * @remarks
 * - Permission gate: `TRAVEL_GROUP_VIEW`.
 * - Management affordances are additionally gated at the component level with
 *   `TRAVEL_GROUP_MANAGE`.
 */

import { Users, Package } from "lucide-react";
import type { RouteMeta } from "../../shell/routing";

export const operationsMeta: RouteMeta[] = [
  {
    path: "/travel-groups",
    title: "Travel groups",
    navigation: {
      label: "Travel groups",
      icon: Users,
      order: 40,
      group: "Operations",
    },
    breadcrumb: { label: "Travel groups" },
    permission: "TRAVEL_GROUP_VIEW",
  },
  {
    path: "/travel-groups/new",
    title: "Create travel group",
    breadcrumb: { label: "Create" },
    permission: "TRAVEL_GROUP_MANAGE",
    navigation: { label: "Create", parent: "/travel-groups", hidden: true },
  },
  {
    path: "/travel-groups/:id",
    title: "Travel group detail",
    breadcrumb: { label: "Detail" },
    permission: "TRAVEL_GROUP_VIEW",
    navigation: { label: "Detail", parent: "/travel-groups", hidden: true },
  },
  {
    path: "/travel-groups/:id/edit",
    title: "Edit travel group",
    breadcrumb: { label: "Edit" },
    permission: "TRAVEL_GROUP_MANAGE",
    navigation: { label: "Edit", parent: "/travel-groups", hidden: true },
  },
  {
    path: "/logistics",
    title: "Logistics",
    navigation: {
      label: "Logistics",
      icon: Package,
      order: 41,
      group: "Operations",
    },
    breadcrumb: { label: "Logistics" },
    permission: "TRAVEL_GROUP_VIEW",
  },
];
