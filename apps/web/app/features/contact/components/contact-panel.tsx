/**
 * Concierge contact panel with phone, WhatsApp, email, and live office hours.
 *
 * @remarks
 * - Computes open/closed status from the visitor's local clock.
 * - Uses existing design tokens for colour and spacing.
 */

import { useEffect, useState } from 'react';
import {
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react';
import { Separator } from '@kafi/ui';

const PHONE_PRIMARY = '+251 111 262 965';
const PHONE_MOBILE = '+251 930 737 337';
const WHATSAPP_HREF = 'https://wa.me/251930737337';

const OFFICE_HOURS = [
  {
    day: 'Monday – Friday',
    hours: '8:00 AM – 6:00 PM',
    days: [1, 2, 3, 4, 5],
    open: [8, 18],
  },
  { day: 'Saturday', hours: '9:00 AM – 3:00 PM', days: [6], open: [9, 15] },
  { day: 'Sunday', hours: 'Closed (emergency only)', days: [0], open: null },
] as const;

/**
 * Tracks the current local time and derives today's office-open status.
 *
 * @returns The open/closed state, today's schedule, and the current time.
 *
 * @remarks
 * - Updates once per minute so the "Open now" badge stays accurate.
 * - Sunday is always treated as closed.
 */
function useOfficeStatus() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = OFFICE_HOURS.find((h) =>
    (h.days as readonly number[]).includes(now.getDay()),
  );
  const isOpen = today?.open
    ? minutes >= today.open[0] * 60 && minutes < today.open[1] * 60
    : false;

  return { isOpen, today, now };
}

/**
 * Renders a contact panel section with an icon, title, and children.
 *
 * @param icon - The Phosphor icon component to render.
 * @param title - Small uppercase section title.
 * @param children - Contact details for this section.
 * @returns A flex row with an icon and content column.
 */
function PanelSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 shrink-0">
        <Icon className="size-5 text-accent" weight="light" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

/**
 * Renders the concierge contact panel.
 *
 * @returns The panel with phone, WhatsApp, email, and office hours.
 */
export default function ContactPanel() {
  const { isOpen } = useOfficeStatus();

  return (
    <aside className="lg:border-l lg:border-border/40 lg:pl-12">
      <div className="space-y-8">
        <PanelSection icon={PhoneIcon} title="Call us">
          <div className="space-y-1.5">
            <a
              href={`tel:${PHONE_PRIMARY.replace(/\s/g, '')}`}
              className="block text-base font-medium text-foreground hover:text-accent"
            >
              {PHONE_PRIMARY}
            </a>
            <a
              href={`tel:${PHONE_MOBILE.replace(/\s/g, '')}`}
              className="block text-base font-medium text-foreground hover:text-accent"
            >
              {PHONE_MOBILE}
            </a>
          </div>
        </PanelSection>

        <Separator />

        <PanelSection icon={WhatsappLogoIcon} title="WhatsApp">
          <div className="space-y-3">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="btn-outline inline-flex h-11 items-center gap-2 px-5 text-sm"
            >
              <WhatsappLogoIcon className="size-5" weight="fill" />
              Chat on WhatsApp
            </a>
            <p className="text-sm text-muted-foreground">{PHONE_MOBILE}</p>
          </div>
        </PanelSection>

        <Separator />

        <PanelSection icon={EnvelopeIcon} title="Email">
          <div className="space-y-1.5">
            <a
              href="mailto:info@kafitour.com"
              className="block text-sm font-medium text-foreground hover:text-accent"
            >
              info@kafitour.com
            </a>
            <a
              href="mailto:bookings@kafitour.com"
              className="block text-sm font-medium text-foreground hover:text-accent"
            >
              bookings@kafitour.com
            </a>
          </div>
        </PanelSection>

        <Separator />

        <PanelSection icon={ClockIcon} title="Office hours">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-amber-500'}`}
              />
              <span className="text-sm font-medium text-foreground">
                {isOpen ? 'Open now' : 'Closed now'}
              </span>
            </div>
            <dl className="space-y-2">
              {OFFICE_HOURS.map((item) => (
                <div
                  key={item.day}
                  className="flex justify-between gap-4 text-sm"
                >
                  <dt className="font-light text-muted-foreground">
                    {item.day}
                  </dt>
                  <dd className="text-right font-medium text-foreground">
                    {item.hours}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </PanelSection>
      </div>
    </aside>
  );
}
