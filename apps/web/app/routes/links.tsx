import { Button } from '@kafi/ui';
import {
  TiktokLogoIcon,
  WhatsappLogoIcon,
  EnvelopeSimpleIcon,
  TelegramLogoIcon,
  PhoneCallIcon,
} from '@phosphor-icons/react';

import { ArrowUpRight, MapPin, Package, House } from 'lucide-react';
import { Link } from 'react-router';

const SITE_URL = 'https://kafitour.com';

const LINKS = {
  packages: `${SITE_URL}/packages`,
  location:
    'https://www.google.com/maps/dir/?api=1&destination=Kafi%20Tour%20and%20Travel%20Plc%2C%20Yobek%20Business%20Center%2C%20Addis%20Ababa%2C%20Ethiopia',
  home: SITE_URL,
};

const socialLinks = [
  {
    name: 'Telegram',
    href: 'https://t.me/kafitour',
    Icon: TelegramLogoIcon,
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@kafitour5',
    Icon: TiktokLogoIcon,
  },
  {
    name: 'WhatsApp',
    href: 'https://wa.me/kafitour',
    Icon: WhatsappLogoIcon,
  },
  {
    name: 'Call Kafi Tours',
    href: 'tel:+251930737337',
    Icon: PhoneCallIcon,
  },
  {
    name: 'Email',
    href: 'mailto:info@kafitour.com',
    Icon: EnvelopeSimpleIcon,
  },
];

const actions = [
  {
    label: 'Our Packages',
    href: LINKS.packages,
    Icon: Package,
    external: false,
  },
  {
    label: 'Our Location',
    href: LINKS.location,
    Icon: MapPin,
    external: true,
  },
  {
    label: 'Visit Our Website',
    href: LINKS.home,
    Icon: House,
    external: false,
  },
];

export default function Links() {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-8 font-montserrat sm:px-6 text-brand-primary dark:text-primary">
      {/* Subtle gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(197,160,89,0.14),transparent_55%)]"
      />

      <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
        {/* Logo */}
        <a
          href={LINKS.home}
          aria-label="Kafi Tour & Travel homepage"
          className="mb-4 inline-flex rounded-full transition-transform hover:scale-105"
        >
          <img
            src="/kafi-icon-green.svg"
            alt="Kafi Tour & Travel logo"
            className="size-20 object-contain sm:size-22"
          />
        </a>

        {/* Brand name */}
        <h1 className="text-7xl font-bold tracking-[0.18em] sm:text-3xl">
          <span className="flex gap-1.5 text-brand-primary overflow-hidden whitespace-nowrap font-heading font-bold tracking-tight">
            <span>KAFI</span>
            <span className="font-medium text-accent">TOURS</span>
          </span>
        </h1>

        {/* Website URL */}
        <a
          href={LINKS.home}
          className="mt-2 inline-flex items-center gap-1 text-sm  transition-colors hover:text-brand-gold/80 sm:text-base text-relaxed"
        >
          <code>https://www.kafitour.com</code>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>

        {/* Social media and contact links */}
        <nav
          aria-label="Social media and contact links"
          className="mt-7 flex w-full items-center justify-center gap-2.5"
        >
          {socialLinks.map(({ name, href, Icon }) => {
            const external = href.startsWith('https://');

            return (
              <a
                key={name}
                href={href}
                aria-label={name}
                title={name}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="grid size-9 shrink-0 place-items-center rounded-full  transition-all duration-200 hover:-translate-y-1 hover:bg-brand-gold hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold sm:size-10"
              >
                <Icon size={32} weight="light" aria-hidden="true" />
              </a>
            );
          })}
        </nav>

        {/* Main action buttons */}
        <nav
          aria-label="Quick links"
          className="mt-8 flex w-full flex-col gap-3"
        >
          {actions.map(({ label, href, Icon, external }) => {
            const isLocation = label === 'Our Location';

            return (
              <Button
                key={label}
                variant="default"
                size="lg"
                render={
                  external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" />
                  ) : label === 'Visit Our Website' ? (
                    <a href={href} />
                  ) : (
                    <Link to={href} />
                  )
                }
                className="group relative py-3 px-12 h-12 text-sm shadow-soft rounded-full min-h-12 text-brand-goldLight"
              >
                {/* Side icon: location uses its pin in the subtitle instead */}
                {!isLocation && (
                  <span className="absolute left-4 grid size-10 shrink-0 place-items-center rounded-full bg-brand-primary/5  transition-colors group-hover:bg-brand-primary/10">
                    <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                )}

                {/* Centered button label and optional subtitle */}
                <span className="flex min-w-0 flex-col items-center justify-center text-center">
                  <span className="text-sm font-stretch-semi-expanded font-semibold sm:text-base">
                    {label}
                  </span>

                  {isLocation && (
                    <span className="mt-1 flex max-w-full items-center justify-center gap-1 text-xs leading-relaxed text-muted-foreground transition-colors group-hover:text-brand-primary/70 sm:text-sm">
                      <MapPin
                        size={8}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                      <span>Kafi Tour and Travel PLC · Addis Ababa</span>
                    </span>
                  )}
                </span>

                {/* Direction indicator */}
                <ArrowUpRight
                  size={19}
                  strokeWidth={1.8}
                  className="absolute right-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-primary/70"
                  aria-hidden="true"
                />
              </Button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
