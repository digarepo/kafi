import { Button } from '@ui/components/ui/button';
import { Separator } from '@ui/components/ui/separator';
import { TypingAnimation } from '@ui/components/TypingAnimation';
import { AirplaneIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { listPublicPackages, type PublicNextDeparture } from '@/lib/public-api';

function formatDepartureDate(value: string | null): string {
  if (!value) return 'Date TBA';

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(date.getTime())) return 'Date TBA';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Decorative concentric arcs evoking tawaf circles, rendered behind the hero.
 */
function TawafArcs() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 h-[42rem] w-[42rem] text-primary/10 dark:text-primary/15"
      viewBox="0 0 600 600"
      fill="none"
    >
      {[290, 240, 190, 140, 90].map((r) => (
        <circle
          key={r}
          cx="300"
          cy="300"
          r={r}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray={r === 190 ? '4 8' : undefined}
        />
      ))}
      <circle cx="300" cy="10" r="5" fill="currentColor" />
      <circle cx="540" cy="300" r="4" fill="currentColor" />
    </svg>
  );
}

/**
 * Barcode-style decorative strip for the ticket stub.
 */
function Barcode() {
  const bars = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3];
  return (
    <div aria-hidden="true" className="flex items-end gap-[3px] h-8 shrink-0">
      {bars.map((w, i) => (
        <span
          key={i}
          className="bg-foreground/60 dark:bg-foreground/50"
          style={{ width: `${w}px`, height: i % 4 === 0 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * Boarding-pass style card presenting the next scheduled departure.
 */
function DepartureTicket({
  departure,
  loading,
}: {
  departure: PublicNextDeparture | null;
  loading: boolean;
}) {
  return (
    <div className="relative w-full max-w-md">
      {/* Soft shadow layer to fake depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-y-3 rotate-2 rounded-3xl bg-primary/10 dark:bg-primary/20 blur-sm"
      />
      <div className="relative rounded-3xl border border-border/50 bg-card shadow-elevated overflow-hidden">
        {/* Top — route */}
        <div className="p-6 pb-5 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-accent">
              Next Departure
            </span>
            <AirplaneIcon weight="fill" className="w-5 h-5 text-primary" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-heading text-3xl font-semibold tracking-tight">
                ADD
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Addis Ababa
              </p>
            </div>
            <div className="flex-1 px-2 relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 200 40"
                className="w-full h-10 text-accent"
                fill="none"
              >
                <path
                  d="M4 32 Q100 -8 196 32"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                <circle cx="4" cy="32" r="3" fill="currentColor" />
                <circle cx="196" cy="32" r="3" fill="currentColor" />
              </svg>
              <AirplaneIcon
                weight="fill"
                className="w-4 h-4 text-accent absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 rotate-45"
              />
            </div>
            <div className="text-right">
              <p className="font-heading text-3xl font-semibold tracking-tight">
                JED
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Jeddah</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Departure</span>
            <span className="font-semibold text-foreground">
              {loading
                ? 'Loading…'
                : formatDepartureDate(departure?.departureDate ?? null)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Flight</span>
            <span className="font-semibold text-foreground">
              {loading
                ? 'Loading…'
                : departure?.flightNumber
                  ? `${departure.flightNumber} · Confirmed`
                  : 'To be announced'}
            </span>
          </div>
        </div>

        {/* Perforated divider with side notches */}
        <div className="relative px-6">
          <Separator className="border-t border-dashed border-border/70 bg-transparent h-px" />
          <span
            aria-hidden="true"
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background border border-border/50"
          />
          <span
            aria-hidden="true"
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background border border-border/50"
          />
        </div>

        {/* Bottom — stub details */}
        <div className="p-6 pt-5">
          <div className="flex items-end justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Makkah Hotel
                </p>
                <p className="text-xs font-semibold text-primary mt-1 truncate">
                  {departure?.makkahHotel ??
                    (loading ? 'Loading…' : 'To be confirmed')}
                </p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Madinah Hotel
                </p>
                <p className="text-xs font-semibold text-primary mt-1 truncate">
                  {departure?.madinahHotel ??
                    (loading ? 'Loading…' : 'To be confirmed')}
                </p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Duration
                </p>
                <p className="text-xs font-semibold text-accent mt-1">
                  {loading
                    ? 'Loading…'
                    : departure?.durationDays != null
                      ? `${departure.durationDays} days`
                      : 'TBC'}
                </p>
              </div>
            </div>
            <Barcode />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the landing page hero section with travel highlights and departure information.
 *
 * @returns The hero section component for the home page.
 *
 * @remarks
 * - Displays the primary marketing message and call-to-action.
 * - Presents a boarding-pass style departure card with live schedule data.
 */
export function Hero() {
  const [nextDeparture, setNextDeparture] =
    useState<PublicNextDeparture | null>(null);
  const [departureLoading, setDepartureLoading] = useState(true);

  useEffect(() => {
    let active = true;

    listPublicPackages({ includeDeparture: true })
      .then((response) => {
        if (active) setNextDeparture(response.nextDeparture ?? null);
      })
      .catch((error: unknown) => {
        console.error('Failed to load next departure:', error);
      })
      .finally(() => {
        if (active) setDepartureLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden min-h-[92vh] flex items-center pt-28 pb-20"
    >
      {/* Ambient gold + green glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />
      <TawafArcs />

      <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-12 grid gap-14 lg:grid-cols-12 lg:items-center relative z-10">
        {/* Left — headline */}
        <div className="space-y-8 lg:col-span-6 text-left">
          <div className="space-y-5">
            <h1
              className="font-heading text-[2.5rem] sm:text-6xl font-semibold tracking-[-0.035em] text-balance leading-[1.05] text-foreground"
              aria-label="Umrah made Simple"
            >
              <span>Umrah,</span> <br />
              made &nbsp;
              <span className="text-primary" aria-hidden="true">
                <TypingAnimation
                  words={['Simple', 'Easy', 'Accessible']}
                  loop
                  typeSpeed={50}
                  deleteSpeed={50}
                  pauseDelay={2000}
                />
              </span>
            </h1>
            <p className="max-w-xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
              Flights, visa, hotels near the Haram, and ground guidance -
              arranged end to end so you can devote your attention to worship,
              not logistics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link to="/booking">
              <Button className="h-12 px-8 text-sm font-semibold shadow-soft">
                Book Umrah
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                variant="ghost"
                className="h-12 px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Talk to us
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground tracking-wide">
            Licensed travel operator · Addis Ababa, Ethiopia
          </p>
        </div>

        {/* Right — boarding pass */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end items-center">
          <DepartureTicket
            departure={nextDeparture}
            loading={departureLoading}
          />
        </div>
      </div>
    </section>
  );
}
