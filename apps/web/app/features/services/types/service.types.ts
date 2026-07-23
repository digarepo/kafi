import type { Icon } from '@phosphor-icons/react';

export interface ServiceStep {
  title: string;
  description: string;
}
/**
 * Service package interface representing a single offering.
 */
export interface ServiceItem {
  id: string;
  slug: string;
  icon: Icon;
  name: string;
  tagline: string;
  description: string;
  details: string;
  steps: ServiceStep[];
  tag: string;
}
