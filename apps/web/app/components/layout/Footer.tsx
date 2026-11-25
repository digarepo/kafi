import {
  PhoneCallIcon,
  EnvelopeIcon,
  MapPinIcon,
  TelegramLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react';
import { Link } from 'react-router';

/**
 * Dome silhouette divider that crowns the footer band.
 */
function FooterDome() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      className="block w-full h-8 sm:h-12 text-primary"
      fill="currentColor"
    >
      <path d="M0 48 L0 34 Q260 8 520 34 Q640 46 680 34 Q700 12 720 4 Q740 12 760 34 Q800 46 920 34 Q1180 8 1440 34 L1440 48 Z" />
    </svg>
  );
}

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/packages', label: 'Packages' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQs' },
  { to: '/contact', label: 'Contact' },
];

const SOCIALS = [
  {
    href: 'https://t.me/kafitour',
    label: 'Telegram',
    icon: TelegramLogoIcon,
  },
  {
    href: 'https://www.tiktok.com/@kafitour5',
    label: 'TikTok',
    icon: TiktokLogoIcon,
  },
  {
    href: 'https://wa.me/251930737337',
    label: 'WhatsApp',
    icon: WhatsappLogoIcon,
  },
];

/**
 * Renders the site footer with brand info, navigation links, contact details, and social links.
 *
 * @returns The footer section component.
 */
export function Footer() {
  return (
    <footer id="footer" className="relative z-10">
      <FooterDome />
      <div className="bg-primary text-white relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-star-pattern opacity-[0.06] invert pointer-events-none"
        />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 pt-14 pb-28 md:pb-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-12 text-left">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/kafi-icon-gold.svg"
                alt="Kafi Tours Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <span className="font-heading text-lg font-bold tracking-tight">
                KAFI <span className="text-accent font-medium">TOURS</span>
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm">
              End-to-end Umrah travel coordination — flights, visa,
              accommodation, and guidance. A licensed travel operator based in
              Addis Ababa, Ethiopia.
            </p>
            <div className="flex gap-2.5 pt-1">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-all duration-300 hover:border-accent hover:text-accent hover:-translate-y-0.5"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-4 lg:col-span-2 lg:col-start-6">
            <h2 className="font-heading text-xs font-semibold text-accent uppercase tracking-[0.18em]">
              Explore
            </h2>
            <ul className="space-y-2.5 text-sm text-white/70">
              {QUICK_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="hover:text-accent transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4 lg:col-span-4 lg:col-start-9">
            <h2 className="font-heading text-xs font-semibold text-accent uppercase tracking-[0.18em]">
              Contact
            </h2>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2.5">
                <EnvelopeIcon className="w-4 h-4 text-accent shrink-0" />
                <a
                  href="mailto:info@kafitour.com"
                  className="hover:text-accent transition-colors"
                >
                  info@kafitour.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneCallIcon className="w-4 h-4 text-accent shrink-0" />
                <a
                  href="tel:+251111262965"
                  className="hover:text-accent transition-colors"
                >
                  +251 111 262 965
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneCallIcon className="w-4 h-4 text-accent shrink-0" />
                <a
                  href="tel:+251930737337"
                  className="hover:text-accent transition-colors"
                >
                  +251 930 737 337
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Kafi%20Tour%20and%20Travel%20Plc%2C%20Yobek%20Business%20Center%2C%20Addis%20Ababa%2C%20Ethiopia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  Yobek Commercial, Addis Ababa, Ethiopia
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-6 pb-24 md:pb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
            <p>© {new Date().getFullYear()} Kafi Tours. All rights reserved.</p>
            <div className="flex gap-5">
              <Link
                to="/privacy"
                className="hover:text-accent transition-colors"
              >
                Privacy Policy
              </Link>
              <Link to="/tos" className="hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
