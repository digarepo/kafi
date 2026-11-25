/**
 * Contact page for Kafi Tours.
 *
 * @remarks
 * - Renders the editorial enquiry experience: hero, quick actions, enquiry form,
 *   concierge panel, and embedded office map.
 * - Preserves generous spacing while keeping typography refined and visual depth
 *   restrained.
 */

import {
  ArrowRightIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react';
import { Button } from '@ui/components/ui/button';

import ContactPanel from './contact-panel';
import EnquiryForm from './contact-form';
import { Link } from 'react-router';

const PHONE_PRIMARY = '+251 111 262 965';
const WHATSAPP_HREF = 'https://wa.me/251930737337';

const LOCATION = {
  name: 'Yobek Commercial Center',
  address: 'Kirkos Sub-City, Addis Ababa, Ethiopia',
  embedUrl:
    'https://maps.google.com/maps?q=9.013567,38.747418&t=&z=17&ie=UTF8&iwloc=&output=embed',
  directionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=9.013567%2C38.747418',
};

export default function ContactPage() {
  return (
    <main id="main-content">
      <section className="relative overflow-hidden pt-32 pb-14 md:pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-heading text-balance text-[2.25rem] sm:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] leading-[1.08] text-foreground">
              Begin your journey with{' '}
              <span className="text-primary">a conversation.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
              Whether you are planning your first Umrah or a bespoke travel
              experience, our team is here to guide you with care, clarity and
              deep local expertise.
            </p>
          </div>

          <div className="mt-12 grid divide-y divide-border/30 rounded-2xl border border-border/40 bg-card shadow-soft sm:mt-16 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Link
              to="#enquiry"
              className="group flex items-center justify-between gap-4 px-6 py-5 sm:py-6 transition-colors hover:bg-accent/5 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/15 text-accent">
                  <EnvelopeIcon className="size-5" weight="duotone" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Send an enquiry
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
            </Link>

            <Link
              to={`tel:${PHONE_PRIMARY.replace(/\s/g, '')}`}
              className="group flex items-center justify-between gap-4 px-6 py-5 sm:py-6 transition-colors hover:bg-accent/5"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/15 text-accent">
                  <PhoneIcon className="size-5" weight="duotone" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Call us
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
            </Link>

            <Link
              to={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-4 px-6 py-5 sm:py-6 transition-colors hover:bg-accent/5 rounded-b-2xl sm:rounded-r-2xl sm:rounded-bl-none"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/15 text-accent">
                  <WhatsappLogoIcon className="size-5" weight="duotone" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  WhatsApp
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          </div>
        </div>
      </section>

      <section id="enquiry" className="bg-muted/30 py-16 md:py-24 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-heading text-balance text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Tailor your enquiry
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Share a few details and a travel coordinator will prepare a
              personal response. All fields marked with an asterisk are
              required.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <EnquiryForm />
            </div>
            <div className="lg:col-span-5">
              <ContactPanel />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-4">
              <h2 className="font-heading text-balance text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Our office
              </h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/15 text-accent">
                    <MapPinIcon className="size-5" weight="duotone" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">
                      {LOCATION.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {LOCATION.address}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  render={
                    <a
                      href={LOCATION.directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  className="h-11 gap-2 px-5 text-sm font-semibold"
                >
                  Get directions <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-soft">
                <iframe
                  title="Kafi Tours office location"
                  src={LOCATION.embedUrl}
                  className="h-80 w-full border-0 md:h-96"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
