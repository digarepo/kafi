import { Separator } from "@kafi/ui";
import {
  PhoneCallIcon,
  EnvelopeIcon,
  MapPinIcon,
  FacebookLogo,
  InstagramLogo,
  TelegramLogo,
} from "@phosphor-icons/react";
import { Link } from "react-router";

/**
 * Renders the site footer with brand info, navigation links, contact details, and social links.
 *
 * @returns The footer section component.
 */
export function Footer() {
  return (
    <footer
      id="footer"
      className="bg-muted border-t border pt-16 pb-28 md:pb-12 text-left relative z-10"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
        {/* Brand */}
        <div className="space-y-4 lg:col-span-4">
          <div className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full shadow-soft">
              <img
                src="/KafiOr.svg"
                alt="Kafi Tours Logo"
                className="block h-10 w-10 transition-transform duration-300 hover:rotate-12 dark:hidden"
              />
              <img
                src="/KafiDef.svg"
                alt="Kafi Tours Logo"
                className="hidden h-10 w-10 transition-transform duration-300 hover:rotate-12 dark:block"
              />
            </div>
            <span className="font-heading text-md font-bold tracking-tight">
              KAFI <span className="text-accent font-medium">TOURS</span>
            </span>
          </div>
          <p className="text-[12px] font-light leading-relaxed max-w-sm">
            Coordinates and delivers high-end Hajj, Umrah, and luxury tours. Fully licensed travel
            agency providing end-to-end logistics solutions.
          </p>
        </div>

        {/* Follow Us */}
        <div className="space-y-3 lg:col-span-2">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Follow Us
          </h4>
          <ul className="space-y-2">
            <li>
              <a
                href="https://t.me/kafitours"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors text-xs text-muted-foreground flex items-center gap-2"
              >
                <TelegramLogo className="w-4 h-4 text-accent shrink-0" />
                <span>Telegram</span>
              </a>
            </li>
            <li>
              <a
                href="https://facebook.com/kafitours"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors text-xs text-muted-foreground flex items-center gap-2"
              >
                <FacebookLogo className="w-4 h-4 text-accent shrink-0" />
                <span>Facebook</span>
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/kafitours"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors text-xs text-muted-foreground flex items-center gap-2"
              >
                <InstagramLogo className="w-4 h-4 text-accent shrink-0" />
                <span>Instagram</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="space-y-3 lg:col-span-2">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Quick Links
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground font-light">
            <li>
              <Link to="/" className="hover:text-accent transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-accent transition-colors">
                Services
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-accent transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-accent transition-colors">
                FAQs
              </Link>
            </li>
            <li>
              <Link to="/packages" className="hover:text-accent transition-colors">
                Packages
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-accent transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Support */}
        <div className="space-y-3 lg:col-span-4">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Contact Support
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground font-light">
            <li className="flex items-center gap-1.5">
              <EnvelopeIcon className="w-4 h-4 text-accent shrink-0" />
              <a href="mailto:info@kafitour.com">
                <span>info@kafitour.com</span>
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <PhoneCallIcon className="w-4 h-4 text-accent shrink-0" />
              <a href="tel:+251111262965">
                <span>+251 111 262 965</span>
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <PhoneCallIcon className="w-4 h-4 text-accent shrink-0" />
              <a href="tel:+251930737337">
                <span>+251 930 737 337</span>
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4 text-accent shrink-0" />
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=9.013567%2C38.747418"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Yobek Commercial, Addis Ababa, Ethiopia</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <Separator className="my-10 max-w-7xl mx-auto" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-normal">
        <p>© {new Date().getFullYear()} Kafi Tours. All rights reserved.</p>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-accent transition-colors">
            Privacy Policy
          </Link>
          <Link to="/tos" className="hover:text-accent transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
