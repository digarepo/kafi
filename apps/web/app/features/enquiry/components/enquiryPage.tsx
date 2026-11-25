/**
 * Standalone enquiry page for Kafi Tours.
 *
 * @remarks
 * - Reads `?package=:slug` and `?service=:slug` query parameters.
 * - Resolves package and service context from the existing `packages` and
 *   `services` feature data.
 * - Renders an editorial hero, the enquiry form, and the form's success state.
 */

import { useSearchParams } from 'react-router';

import { packages } from '@/features/packages/data/packages';
import { services } from '@/features/services/data/services';

import EnquiryForm from './enquiry-form';

export default function EnquiryPage() {
  const [searchParams] = useSearchParams();
  const packageParam = searchParams.get('package');
  const serviceParam = searchParams.get('service');
  const topicParam = searchParams.get('topic');

  const prefilledPackage = packageParam
    ? packages.find(
        (pkg) => pkg.slug === packageParam || pkg.id === packageParam,
      )
    : undefined;

  const prefilledService = serviceParam
    ? services.find(
        (service) =>
          service.slug === serviceParam || service.id === serviceParam,
      )
    : undefined;

  const prefilledTopicName =
    topicParam === 'custom-package' ? 'Custom / Group Package' : undefined;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden pt-32 pb-14 md:pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full ambient-glow-accent opacity-25"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full ambient-glow-primary opacity-25"
        />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-heading text-balance text-[2.25rem] sm:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] leading-[1.08] text-foreground">
              Send us <span className="text-primary">an enquiry.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
              Whether you have a question about a package, a service, or a
              custom travel plan, our team is ready to help.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-24 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
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
              <div className="card border-border/40 p-6 sm:p-8">
                <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  How we respond
                </h2>

                <ul className="mt-5 space-y-5 text-sm leading-6 text-muted-foreground">
                  {[
                    'We read your enquiry and check the relevant details.',
                    'A travel coordinator contacts you by phone or email.',
                    'We prepare a clear answer or a personalised proposal.',
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent">
                        {i + 1}
                      </span>
                      <span className="pt-1">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
