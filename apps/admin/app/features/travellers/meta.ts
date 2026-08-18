/**
 * Route metadata for the travellers admin feature.
 *
 * @remarks
 * - Permission gate: `TRAVELLER_VIEW`.
 * - Navigation is grouped under Operations, ordered after Packages.
 */

import { Calendar, Users } from "lucide-react";
import type { RouteMeta } from "../../shell/routing";

export const travellersMeta: RouteMeta[] = [
  {
    path: "/traveller-booking",
    title: "Booking",
    navigation: {
      label: "Booking",
      icon: Calendar,
      order: 25,
      group: "Operations",
      isGroup: true,
    },
    breadcrumb: { label: "Booking", hidden: true },
  },
  {
    path: "/travellers",
    title: "Travellers",
    navigation: {
      label: "Travellers",
      icon: Users,
      order: 26,
      parent: "/traveller-booking",
    },
    breadcrumb: { label: "Travellers" },
    permission: "TRAVELLER_VIEW",
  },
  {
    path: "/travellers/new",
    title: "Create traveller",
    breadcrumb: { label: "Create" },
    permission: "TRAVELLER_CREATE",
    navigation: { label: "Create", parent: "/travellers", hidden: true },
  },
  {
    path: "/travellers/:id",
    title: "Traveller detail",
    breadcrumb: { label: "Detail" },
    permission: "TRAVELLER_VIEW",
    navigation: { label: "Detail", parent: "/travellers", hidden: true },
  },
  {
    path: "/travellers/:id/edit",
    title: "Edit traveller",
    breadcrumb: { label: "Edit" },
    permission: "TRAVELLER_EDIT",
    navigation: { label: "Edit", parent: "/travellers", hidden: true },
  },
  {
    path: "/contact-persons",
    title: "Contact persons",
    navigation: {
      label: "Contact persons",
      icon: Users,
      order: 27,
      parent: "/traveller-booking",
    },
    breadcrumb: { label: "Contact persons" },
    permission: "TRAVELLER_VIEW",
  },
  {
    path: "/contact-persons/new",
    title: "Create contact person",
    breadcrumb: { label: "Create" },
    permission: "TRAVELLER_VIEW",
    navigation: { label: "Create", parent: "/contact-persons", hidden: true },
  },
  {
    path: "/contact-persons/:id",
    title: "Contact person detail",
    breadcrumb: { label: "Detail" },
    permission: "TRAVELLER_VIEW",
    navigation: { label: "Detail", parent: "/contact-persons", hidden: true },
  },
  {
    path: "/contact-persons/:id/edit",
    title: "Edit contact person",
    breadcrumb: { label: "Edit" },
    permission: "TRAVELLER_VIEW",
    navigation: { label: "Edit", parent: "/contact-persons", hidden: true },
  },
  {
    path: "/registrations",
    title: "Registrations",
    navigation: {
      label: "Registrations",
      icon: Users,
      order: 28,
      parent: "/traveller-booking",
    },
    breadcrumb: { label: "Registrations" },
    permission: "REGISTRATION_VIEW",
  },
  {
    path: "/registrations/new",
    title: "Create registration",
    breadcrumb: { label: "Create" },
    permission: "REGISTRATION_CREATE",
    navigation: { label: "Create", parent: "/registrations", hidden: true },
  },
  {
    path: "/registrations/:id",
    title: "Registration detail",
    breadcrumb: { label: "Detail" },
    permission: "REGISTRATION_VIEW",
    navigation: { label: "Detail", parent: "/registrations", hidden: true },
  },
  {
    path: "/registrations/:id/edit",
    title: "Edit registration",
    breadcrumb: { label: "Edit" },
    permission: "REGISTRATION_EDIT",
    navigation: { label: "Edit", parent: "/registrations", hidden: true },
  },
];
