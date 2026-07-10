import { Button, Input, Separator } from '@kafi/ui';
import {
  PhoneCallIcon,
  EnvelopeIcon,
  MapPinIcon,
  PaperPlaneRightIcon,
} from '@phosphor-icons/react';
import { Link } from 'react-router';

export function Footer() {
  return (
    <footer
      id="footer"
      className="bg-muted border-t border pt-16 pb-28 md:pb-12 text-left relative z-10"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
        {/* Brand */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full shadow-soft">
              <img src="kafi-icon-gold.svg" className="h-11 w-11" />
            </div>
            <span className="font-heading text-md font-bold tracking-tight">
              KAFI <span className="text-accent font-medium">TOURS</span>
            </span>
          </div>
          <p className="text-[12px] font-light leading-relaxed max-w-sm">
            Coordinates and delivers high-end Hajj, Umrah, and luxury tours.
            Fully licensed travel agency providing end-to-end logistics
            solutions.
          </p>
        </div>

        {/* Links Column 1 */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Quick Links
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground font-light">
            <li>
              <a href="#hero" className="hover:text-accent transition-colors">
                Home
              </a>
            </li>
            <li>
              <a
                href="/services"
                className="hover:text-accent transition-colors"
              >
                Services
              </a>
            </li>
            <li>
              <a
                href="packages"
                className="hover:text-accent transition-colors"
              >
                Packages
              </a>
            </li>
            <li>
              <a href="contact" className="hover:text-accent transition-colors">
                Contact
              </a>
            </li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div className="lg:col-span-3 space-y-3">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Contact Support
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground font-light">
            <li className="flex items-center gap-1.5">
              <EnvelopeIcon className="w-4 h-4 text-accent" />
              <a href="mailto:info@kafitour.com">
                <span>info@kafitour.com</span>
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <PhoneCallIcon className="w-4 h-4 text-accent" />
              <a href="tel:+251111262965">
                <span>+251 111 262 965</span>
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <PhoneCallIcon className="w-4 h-4 text-accent" />
              <a href="tel:+251930737337">
                <span>+251 930 737 337</span>
              </a>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4 text-accent" />
              <a
                href="https://maps.app.goo.gl/Zu83sq6i57tYAz9f7?g_st=ic"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Yobek Commercial, Addis Ababa, Ethiopia</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="lg:col-span-3 space-y-3">
          <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
            Stay Updated
          </h4>
          <p className="text-xs text-muted-foreground font-light">
            Subscribe to receive notices of upcoming booking cycles.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Email..."
              className="px-3 py-1.5 border  rounded-lg text-xs h-9"
            />
            <Link to={'/contact'}>
              <Button className="bg-accent text-primary h-9 px-3.5 hover:bg-accent/85 border-none">
                <PaperPlaneRightIcon
                  weight="bold"
                  className="w-4 h-4 rotate-315"
                />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Separator className="my-10 max-w-7xl mx-auto" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-normal">
        <p>© 2026 Kafi Tours. All rights reserved.</p>
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
