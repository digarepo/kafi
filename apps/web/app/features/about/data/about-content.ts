/**
 * Honest, non-numeric content for the About page.
 *
 * @remarks
 * This file contains only general positioning language and principles.
 * No invented facts, statistics, dates, certifications, awards, or people
 * are included.
 */

import {
  type Icon,
  CompassIcon,
  HeartIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@phosphor-icons/react";

/**
 * A single principle that guides Kafi Tours' approach to pilgrimage support.
 */
export interface Principle {
  /** One-word title of the principle. */
  title: string;
  /** Short description of what the principle means in practice. */
  description: string;
  /** Phosphor icon used for visual identification. */
  icon: Icon;
}

/** The four principles that shape how Kafi Tours works with pilgrims. */
export const PRINCIPLES: readonly Principle[] = [
  {
    title: "Clarity",
    description:
      "We explain each part of the journey in plain language, so you know what to expect before you leave.",
    icon: CompassIcon,
  },
  {
    title: "Care",
    description:
      "We treat every enquiry as personal. Your circumstances, questions, and preferences shape the plan we build.",
    icon: HeartIcon,
  },
  {
    title: "Guidance",
    description:
      "From visa paperwork to arrival procedures, we point you in the right direction and stay available along the way.",
    icon: UsersIcon,
  },
  {
    title: "Dependability",
    description:
      "We coordinate with airlines, hotels, and local partners so the arrangements you depend on are in place.",
    icon: ShieldCheckIcon,
  },
];
