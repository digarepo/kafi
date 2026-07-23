/**
 * Standalone enquiry page for Kafi Tours.
 *
 * @remarks
 * - Reads `?package=:slug` and `?service=:slug` query parameters.
 * - Resolves package and service context from the existing `packages` and
 *   `services` feature data.
 * - Renders an editorial hero, the enquiry form, and the form's success state.
 */

import { useSearchParams } from "react-router";
import { Badge } from "@kafi/ui";

import { packages } from "@/features/packages/data/packages";
import { services } from "@/features/services/data/services";

import EnquiryForm from "./enquiry-form";

export default function EnquiryPage() {
  const [searchParams] = useSearchParams();
  const packageParam = searchParams.get("package");
  const serviceParam = searchParams.get("service");
  const topicParam = searchParams.get("topic");

  const prefilledPackage = packageParam
    ? packages.find((pkg) => pkg.slug === packageParam || pkg.id === packageParam)
    : undefined;

  const prefilledService = serviceParam
    ? services.find((service) => service.slug === serviceParam || service.id === serviceParam)
    : undefined;

  const prefilledTopicName = topicParam === "custom-package" ? "Custom / Group Package" : undefined;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/10 bg-linear-to-b from-muted/10 to-background pt-28 pb-12 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              Get in touch
            </Badge>

            <h1 className="mt-6 font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Send us an enquiry.
            </h1>

            <p className="mt-6 text-base font-light leading-relaxed text-muted-foreground md:text-lg">
              Whether you have a question about a package, a service, or a custom pilgrimage plan,
              our team is ready to help.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-muted/10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <EnquiryForm
                defaultPackage={prefilledPackage?.slug}
                defaultService={prefilledService?.slug}
                prefilledPackageName={prefilledPackage?.name}
                prefilledServiceName={prefilledService?.name}
                prefilledTopicName={prefilledTopicName}
              />
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border/20 bg-muted/20 p-6 sm:p-8">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  How we respond
                </h2>

                <ul className="mt-4 space-y-4 text-sm font-light leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      1
                    </span>
                    We read your enquiry and check the relevant details.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      2
                    </span>
                    A travel coordinator contacts you by phone or email.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      3
                    </span>
                    We prepare a clear answer or a personalised proposal.
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
