/**
 * Callback request page for Kafi Tours.
 *
 * @remarks
 * - Reads the `?source=:source` query parameter for lead attribution.
 * - Renders an editorial hero and the compact callback form.
 */

import { useSearchParams } from "react-router";
import { Badge } from "@kafi/ui";

import CallbackForm from "./callback-form";

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source") || undefined;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/10 bg-linear-to-b from-muted/10 to-background pt-28 pb-12 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              Request a callback
            </Badge>

            <h1 className="mt-6 font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              We'll call you back.
            </h1>

            <p className="mt-6 text-base font-light leading-relaxed text-muted-foreground md:text-lg">
              Leave your phone number and a Kafi Tours representative will reach out to answer your
              questions or walk you through the next steps.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-muted/10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5 lg:col-start-4">
              <div className="rounded-2xl border border-border/20 bg-muted/20 p-6 sm:p-8">
                <CallbackForm defaultSource={source} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
