/**
 * Floating contact action button with a fan-out channel picker.
 *
 * @remarks
 * - Opens on click (desktop) or tap (mobile) — no hover trigger.
 * - Options spread in a quarter-circle arc, each emerging from the
 *   midpoint of its predecessor's path (spiral chain) and folding
 *   back in reverse order.
 * - Closes on outside tap, Escape, or option select.
 * - Sits above the mobile bottom nav; positioned bottom-right.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ChatCircleDotsIcon,
  EnvelopeSimpleIcon,
  PhoneIcon,
  TelegramLogoIcon,
  WhatsappLogoIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

type Channel = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  icon: Icon;
  className: string;
};

const CHANNELS: Channel[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    href: 'https://t.me/kafitour',
    external: true,
    icon: TelegramLogoIcon,
    className: 'bg-[#229ED9] text-white',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/251930737337',
    external: true,
    icon: WhatsappLogoIcon,
    className: 'bg-[#25D366] text-white',
  },
  {
    id: 'phone',
    label: 'Call us',
    href: 'tel:+251930737337',
    external: false,
    icon: PhoneIcon,
    className: 'bg-accent text-primary-foreground',
  },
  {
    id: 'email',
    label: 'Email',
    href: 'mailto:info@kafitour.com',
    external: false,
    icon: EnvelopeSimpleIcon,
    className: 'bg-accent text-primary-foreground',
  },
];

const RADIUS = 104;

/**
 * Fan-out positions on a quarter circle, clockwise from straight-left
 * (first item) sweeping up to straight-up (last item) — toward the
 * upper-left from the bottom-right FAB.
 */
function fanOffset(index: number, total: number) {
  const angle = Math.PI / 2 - (index / (total - 1)) * (Math.PI / 2);
  return {
    x: -Math.round(Math.sin(angle) * RADIUS),
    y: -Math.round(Math.cos(angle) * RADIUS),
  };
}

/**
 * Spiral origin: each item emerges from the midpoint of its
 * predecessor's path, so the spread reads as a spiral chain
 * rather than a radial burst.
 */
function spiralOrigin(index: number, total: number) {
  if (index === 0) return { x: 0, y: 0 };
  const prev = fanOffset(index - 1, total);
  return { x: Math.round(prev.x / 2), y: Math.round(prev.y / 2) };
}

export function ContactFab() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 md:bottom-6 md:right-6"
    >
      {/* Fan-out channel options — each emerges from its neighbour's
          position so the spread reads as a chain, not a burst. */}
      {CHANNELS.map((channel, i) => {
        const { x, y } = fanOffset(i, CHANNELS.length);
        const origin = spiralOrigin(i, CHANNELS.length);
        const Icon = channel.icon;
        return (
          <a
            key={channel.id}
            href={channel.href}
            {...(channel.external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
            aria-label={channel.label}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
            className={`group absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full shadow-elevated transition-all duration-300 ease-out hover:scale-110 ${channel.className}`}
            style={{
              transform: open
                ? `translate(${x}px, ${y}px) scale(1)`
                : `translate(${origin.x}px, ${origin.y}px) scale(0.3)`,
              opacity: open ? 1 : 0,
              pointerEvents: open ? 'auto' : 'none',
              transitionDelay: open
                ? `${(CHANNELS.length - 1 - i) * 60}ms`
                : `${i * 45}ms`,
            }}
          >
            <Icon className="h-5 w-5" weight="fill" />
            <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
              {channel.label}
            </span>
          </a>
        );
      })}

      {/* Main FAB */}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close contact options' : 'Contact us'}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-13 w-13 items-center justify-center rounded-full bg-accent text-primary-foreground shadow-elevated transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        <ChatCircleDotsIcon
          className={`absolute h-6 w-6 transition-all duration-200 ${open ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
          weight="fill"
        />
        <XIcon
          className={`absolute h-6 w-6 transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          weight="bold"
        />
      </button>
    </div>
  );
}
