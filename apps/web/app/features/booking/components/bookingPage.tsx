/**
 * Booking request page for Kafi Tours.
 *
 * @remarks
 * - Reads the `?package=:slug` query parameter to pre-select a package.
 * - Renders an editorial hero, the booking form, and a dedicated success state
 *   handled by the form component.
 */

import { useSearchParams } from "react-router";
import { Badge } from "@kafi/ui";

import BookingForm from "./booking-form";
import { packages } from "@/features/packages/data/packages";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const packageParam = searchParams.get("package");

  const prefilledPackage = packageParam
    ? packages.find((pkg) => pkg.slug === packageParam || pkg.id === packageParam)
    : undefined;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/10 bg-linear-to-b from-muted/10 to-background pt-28 pb-12 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              Plan your journey
            </Badge>

            <h1 className="mt-6 font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Begin your booking request.
            </h1>

            <p className="mt-6 text-base font-light leading-relaxed text-muted-foreground md:text-lg">
              Share a few details about your preferred package, travel period, and group size. A
              Kafi travel coordinator will contact you to confirm availability and guide you through
              the next steps.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-muted/10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <BookingForm
                defaultPackage={prefilledPackage?.slug}
                prefilledPackageName={prefilledPackage?.name}
              />
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border/20 bg-muted/20 p-6 sm:p-8">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  What happens next?
                </h2>

                <ul className="mt-4 space-y-4 text-sm font-light leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      1
                    </span>
                    We review your request and check availability.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      2
                    </span>
                    A coordinator calls or messages you to confirm details.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      3
                    </span>
                    We prepare a personalised quote and booking plan.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
