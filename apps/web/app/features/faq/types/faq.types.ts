/**
 * Type definitions for the FAQ feature.
 */

/**
 * A single frequently asked question and its answer.
 */
export interface FaqItem {
  /** Stable identifier used for Accordion values. */
  id: string;
  /** The question text. */
  question: string;
  /** The answer text. */
  answer: string;
}

/**
 * A group of FAQ items under a shared category title.
 */
export interface FaqCategory {
  /** Stable identifier for the category. */
  id: string;
  /** Human-readable category title. */
  title: string;
  /** FAQ items belonging to this category. */
  items: readonly FaqItem[];
}
