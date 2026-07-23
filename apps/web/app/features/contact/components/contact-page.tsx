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
import { Badge } from '@kafi/ui';

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
    <main>
      <section className="relative overflow-hidden border-b border-border/10 bg-linear-to-b from-muted/10 to-background pt-28 pb-12 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-6">
              Contact us
            </Badge>
            <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Begin your journey with a conversation.
            </h1>
            <p className="mt-6 text-base font-light leading-relaxed text-muted-foreground md:text-lg">
              Whether you are planning your first Umrah or a bespoke pilgrimage
              experience, our team is here to guide you with care, clarity and
              deep local expertise.
            </p>
          </div>

          <div className="mt-12 px-2 sm:px-0 grid divide-y rounded-2xl border border-border/20 bg-muted/10 sm:mt-16 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Link
              to="#enquiry"
              className="group flex items-center justify-between gap-4 py-5 sm:px-6 sm:py-6"
            >
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="size-5 text-accent" weight="light" />
                <span className="text-sm font-medium text-foreground">
                  Send an enquiry
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
            </Link>

            <Link
              to={`tel:${PHONE_PRIMARY.replace(/\s/g, '')}`}
              className="group flex items-center justify-between gap-4 py-5 sm:px-6 sm:py-6"
            >
              <div className="flex items-center gap-3">
                <PhoneIcon className="size-5 text-accent" weight="light" />
                <span className="text-sm font-medium text-foreground">
                  Call us
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
            </Link>

            <Link
              to={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-4 py-5 sm:px-6 sm:py-6"
            >
              <div className="flex items-center gap-3">
                <WhatsappLogoIcon
                  className="size-5 text-accent"
                  weight="light"
                />
                <span className="text-sm font-medium text-foreground">
                  WhatsApp
                </span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          </div>
        </div>
      </section>

      <section id="enquiry" className="bg-muted/10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-heading text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Tailor your enquiry
            </h2>
            <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
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

      <section className="border-t border-border/10 bg-muted/20 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Badge variant="outline" className="mb-4">
                Visit us
              </Badge>
              <h2 className="font-heading text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Our office
              </h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPinIcon
                    className="mt-0.5 size-5 shrink-0 text-accent"
                    weight="light"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      {LOCATION.name}
                    </p>
                    <p className="text-sm font-light text-muted-foreground">
                      {LOCATION.address}
                    </p>
                  </div>
                </div>
                <a
                  href={LOCATION.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline inline-flex h-11 items-center gap-2 px-5 text-sm"
                >
                  Get directions <ArrowRightIcon className="size-4" />
                </a>
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
