import type { PackageItinerary } from '../types/package.types';

interface PackageItineraryProps {
  itinerary: PackageItinerary[];
}

/**
 * Renders the package itinerary as a connected vertical timeline.
 *
 * @returns The itinerary timeline component.
 *
 * @remarks
 * - Each phase is an unlabeled solid accent node on a continuous spine, so the
 *   journey reads as a single connected progression rather than dated steps.
 * - The phase label (e.g. "Day 1–2") is intentionally not rendered.
 */
export function PackageItinerary({ itinerary }: PackageItineraryProps) {
  return (
    <ol className="space-y-0">
      {itinerary.map((item, index) => {
        const isLast = index === itinerary.length - 1;

        return (
          <li
            key={item.phase}
            className="relative grid grid-cols-[auto_1fr] gap-5 pb-8 last:pb-0"
          >
            {/* Spine + node column */}
            <div className="relative flex justify-center">
              {/* Continuous connector line (hidden on the last item) */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute top-4 bottom-0 w-px bg-border"
                />
              )}

              {/* Phase node — solid, unlabeled */}
              <span
                aria-hidden
                className="relative z-10 mt-1 h-3 w-3 rounded-full border-2 border-accent bg-accent shadow-soft"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h3 className="font-heading text-base font-bold text-foreground">
                {item.title}
              </h3>

              <p className="max-w-2xl text-sm font-light leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
