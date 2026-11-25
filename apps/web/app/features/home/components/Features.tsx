import { Badge } from '@ui/components/ui/badge';
import { Button } from '@ui/components/ui/button';
import { Card } from '@ui/components/ui/card';
import { Separator } from '@ui/components/ui/separator';
import {
  ArrowRightIcon,
  AirplaneIcon,
  StarIcon,
  UsersIcon,
  ShieldCheckIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { Link } from 'react-router';
import { lazy, Suspense, useEffect, useState } from 'react';

import {
  listPublicPackages,
  type PublicPackageVersion,
} from '@/lib/public-api';

const InlineCallbackForm = lazy(() =>
  import('@/features/callback/components/inline-callback-form').then((m) => ({
    default: m.default,
  })),
);

/**
 * A dome-shaped section divider evoking a mosque silhouette.
 */
function DomeDivider({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={`block w-full h-10 sm:h-14 ${className}`}
      fill="currentColor"
    >
      <path d="M0 60 L0 40 Q240 10 480 40 Q600 55 660 40 Q690 15 720 4 Q750 15 780 40 Q840 55 960 40 Q1200 10 1440 40 L1440 60 Z" />
    </svg>
  );
}

/**
 * Renders the partnerships section showcasing trusted travel and travel partners.
 *
 * @returns The partners section component for the home page.
 *
 * @remarks
 * - Highlights organizations that support Kafi Tours' Hajj and Umrah services.
 * - Reinforces trust through official partner branding and messaging.
 */
export const AIRLINE_LOGOS: { name: string; src: string }[] = [
  { name: 'Ethiopian Airlines', src: '/airlines/ethiopian.png' },
  { name: 'Saudia', src: '/airlines/saudia.png' },
  { name: 'Emirates', src: '/airlines/emirates.png' },
  { name: 'Qatar Airways', src: '/airlines/qatar.png' },
  { name: 'Flynas', src: '/airlines/flynas.png' },
  { name: 'Egyptair', src: '/airlines/egyptair.png' },
];

export function Partners() {
  return (
    <section className="py-12 border-y border-border/30 bg-muted/20 relative z-10 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 text-left">
          <h2 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">
            Flight &amp; Travel Partners
          </h2>
          <p className="text-xs text-muted-foreground">
            Coordinating departures across six international carriers.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          {AIRLINE_LOGOS.map((a) => (
            <span
              key={a.name}
              className="inline-flex h-14 items-center rounded-xl bg-white px-4 py-2.5 shadow-soft border border-border/20 opacity-80 hover:opacity-100 hover:-translate-y-0.5 transition-all duration-300"
            >
              <img
                src={a.src}
                alt={a.name}
                className="h-9 w-auto max-w-32 object-contain"
                height={28}
                loading="lazy"
              />
            </span>
          ))}
          <span className="inline-flex h-14 items-center rounded-xl bg-white px-4 py-2.5 shadow-soft border border-border/20 opacity-80 hover:opacity-100 hover:-translate-y-0.5 transition-all duration-300">
            <img
              src="/hajj-ministry.svg"
              alt="Saudi Ministry of Hajj and Umrah"
              className="h-8 w-auto max-w-28 object-contain"
              height={32}
              loading="lazy"
            />
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the destinations section highlighting the primary travel locations and travel routes.
 *
 * @returns The destinations section component for the home page.
 *
 * @remarks
 * - Showcases Makkah and Madinah as the primary travel destinations.
 * - Highlights Ethiopian Airlines as the primary departure partner from Addis Ababa.
 */
/**
 * A white tile that cycles through the partner airline logos every few seconds.
 */
function RotatingAirlineChip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % AIRLINE_LOGOS.length),
      2800,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-16 w-24 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-soft overflow-hidden relative">
      {AIRLINE_LOGOS.map((a, i) => (
        <img
          key={a.name}
          src={a.src}
          alt={a.name}
          height={36}
          loading="lazy"
          className={`absolute h-9 w-auto max-w-20 object-contain transition-all duration-500 ${
            i === index
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        />
      ))}
    </div>
  );
}

export function Destinations() {
  return (
    <section
      id="destinations"
      className="section-padding bg-muted/30 relative overflow-hidden"
    >
      {/* faint 8-point star motif */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 space-y-14 relative z-10">
        <div className="space-y-3 max-w-xl text-left">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            Travel Destinations
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Curated packages utilizing high-quality logistics and a memorable
            Umrah stay.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Makkah — large showcase */}
          <Card className="card card-hover lg:col-span-7 overflow-hidden border-border/30 flex flex-col justify-between min-h-100 relative group">
            <div className="absolute inset-0 z-0">
              <img
                src="/hero-mecca.webp"
                alt="Makkah Al-Mukarramah with the Masjid al-Haram"
                width={1200}
                height={655}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, 58vw"
                srcSet="/hero-mecca-sm.webp 400w, /hero-mecca-md.webp 768w, /hero-mecca.webp 1200w"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/10" />
            </div>

            <div className="z-10 mt-auto p-6 sm:p-8 space-y-3 max-w-xl text-left">
              <h3 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Makkah Al-Mukarramah
              </h3>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                Perform your umrah with thoughtfully arranged accommodation near
                al-Masjid al-Haram, allowing you to focus on your worship with
                convenience.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-accent pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon className="w-3.5 h-3.5" /> Carefully selected
                  accommodations
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon className="w-3.5 h-3.5" /> Convenient ground
                  transport
                </span>
              </div>
            </div>
          </Card>

          {/* Madinah — arched card */}
          <Card className="card card-hover lg:col-span-5 overflow-hidden border-border/30 flex flex-col justify-between min-h-100 relative group rounded-t-[10rem]">
            <div className="absolute inset-0 z-0">
              <img
                src="/madinah.webp"
                alt="Al-Madinah Al-Munawwarah with the Prophet's Mosque"
                width={1200}
                height={655}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 42vw"
                srcSet="/madinah-sm.webp 400w, /madinah-md.webp 768w, /madinah.webp 1200w"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/10" />
            </div>

            <div className="z-10 mt-auto p-6 space-y-3 text-left">
              <h3 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-white">
                Al-Madinah Al-Munawwarah
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Visit the Prophet’s Mosque (Al-Masjid an-Nabawi) and trace
                historical landmarks in peaceful guided groups.
              </p>
            </div>
          </Card>

          {/* Ethiopian Airlines — dark flight banner */}
          <div className="lg:col-span-12 relative overflow-hidden rounded-2xl bg-primary dark:bg-primary/20 dark:border dark:border-border/40 px-6 py-8 sm:px-10 flex flex-col md:flex-row items-center gap-6">
            <svg
              aria-hidden="true"
              viewBox="0 0 1200 80"
              preserveAspectRatio="none"
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-20 text-white/10 pointer-events-none"
              fill="none"
            >
              <path
                d="M0 60 Q300 -10 600 40 T1200 30"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="6 8"
              />
            </svg>
            <div className="z-10 flex flex-col md:flex-row items-center gap-5 text-center md:text-left relative">
              <RotatingAirlineChip />
              <div className="space-y-1">
                <span className="text-xs text-accent font-semibold uppercase tracking-[0.18em]">
                  Departing Addis Ababa
                </span>
                <h3 className="font-heading text-xl font-semibold text-white tracking-tight">
                  Direct flights, every season
                </h3>
                <p className="text-sm text-white/75 max-w-2xl leading-relaxed">
                  We coordinate direct departures from Addis Ababa Bole (ADD) to
                  Jeddah (JED) and Madinah (MED) across our partner airlines —
                  a comfortable, well-organized start to your journey.
                </p>
              </div>
            </div>
            <div className="z-10 md:ml-auto flex items-center gap-3 text-white/80 text-xs font-semibold shrink-0">
              <span className="rounded-lg border border-white/20 px-2.5 py-1.5">
                ADD
              </span>
              <span aria-hidden="true" className="text-accent">
                ⟶
              </span>
              <span className="rounded-lg border border-white/20 px-2.5 py-1.5">
                JED
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the features section highlighting the core services and benefits offered to pilgrims.
 *
 * @returns The features section component for the home page.
 *
 * @remarks
 * - Showcases the primary travel services provided by Kafi Tours.
 * - Emphasizes convenience, guidance, and coordinated travel logistics.
 */
export function Features() {
  const items = [
    {
      icon: <StarIcon weight="duotone" className="w-5 h-5 text-accent" />,
      title: 'Carefully Selected Accommodation',
      desc: 'Comfortable hotels chosen for quality, convenience, and proximity to the Haram where available.',
    },
    {
      icon: (
        <AirplaneIcon
          weight="duotone"
          className="w-5 h-5 text-accent rotate-45"
        />
      ),
      title: 'Flight Coordination',
      desc: 'Arrangements coordinated with Ethiopian Airlines for a smooth journey from departure to arrival.',
    },
    {
      icon: <UsersIcon weight="duotone" className="w-5 h-5 text-accent" />,
      title: 'Guidance Throughout Your Journey',
      desc: 'Support before and during travel with organized briefings and experienced group coordinators.',
    },
    {
      icon: (
        <ShieldCheckIcon weight="duotone" className="w-5 h-5 text-accent" />
      ),
      title: 'Visa & Travel Assistance',
      desc: 'Assistance with visa processing and the required travel documentation for your journey.',
    },
  ];

  return (
    <section id="features" className="section-padding relative">
      <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-12 grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5 space-y-6 text-left">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.12]">
            Why travelers choose{' '}
            <span className="text-primary">Kafi</span>{' '}
            <span className="text-accent">Tours</span>
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Every Umrah deserves careful planning. We coordinate visa
            processing, flights, accommodation, transportation, and essential
            travel arrangements so you can devote more of your attention to
            worship and less to logistics.
          </p>
          <div className="pt-2">
            <Link to="/services">
              <Button
                className="flex items-center gap-2 text-sm font-semibold h-11 px-6"
                variant="outline"
              >
                Explore Services
                <ArrowRightIcon weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7 grid gap-5 sm:grid-cols-2">
          {items.map((feat, i) => (
            <Card
              key={i}
              className="card group relative p-6 border-border/40 hover:border-accent/40 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 text-left overflow-hidden"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 border border-accent/15 group-hover:bg-accent/15 group-hover:scale-110 transition-all duration-300">
                {feat.icon}
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground mb-1.5">
                {feat.title}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {feat.desc}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Returns the tier key (first word of the template name) used to match slugs.
 */
function tierKey(pkg: PublicPackageVersion): string {
  const template = pkg.package_template?.name ?? pkg.version_name ?? '';
  return template.split(' ')[0]?.toLowerCase() ?? '';
}

/**
 * Renders the pricing section showcasing the available travel packages.
 *
 * @returns The pricing section component for the home page.
 *
 * @remarks
 * - Presents Economy, Comfort, and Premium package options.
 * - Highlights the Comfort package as the recommended choice for most travelers.
 * - Fetches live package slugs from the API so links point to real published
 *   package versions, not hardcoded routes that may 404.
 * - Falls back to `/packages` if the API is unreachable so the link always works.
 */
export function Pricing() {
  const [slugs, setSlugs] = useState<Record<string, string>>({});

  useEffect(() => {
    listPublicPackages()
      .then((res) => {
        const now = new Date();
        const groups = new Map<string, PublicPackageVersion[]>();
        for (const v of res.data) {
          const key = tierKey(v);
          const list = groups.get(key);
          if (list) list.push(v);
          else groups.set(key, [v]);
        }
        const map: Record<string, string> = {};
        for (const [key, versions] of groups) {
          const withDates = versions
            .filter((v) => v.departure_date)
            .map((v) => ({ v, d: new Date(v.departure_date!) }));
          const upcoming = withDates
            .filter((x) => x.d >= now)
            .sort((a, b) => a.d.getTime() - b.d.getTime());
          if (upcoming.length > 0) map[key] = upcoming[0]!.v.slug;
          else {
            const past = withDates.sort(
              (a, b) => b.d.getTime() - a.d.getTime(),
            );
            if (past.length > 0) map[key] = past[0]!.v.slug;
            else map[key] = versions[0]!.slug;
          }
        }
        setSlugs(map);
      })
      .catch(() => {
        // API unreachable — links will fall back to /packages
      });
  }, []);

  const economySlug = slugs['economy']
    ? `/packages/${slugs['economy']}`
    : '/packages';
  const comfortSlug = slugs['comfort']
    ? `/packages/${slugs['comfort']}`
    : '/packages';
  const premiumSlug = slugs['premium']
    ? `/packages/${slugs['premium']}`
    : '/packages';

  const itemCls = 'flex items-start gap-2.5 text-sm';
  const check = <CheckIcon className="text-accent w-4 h-4 shrink-0 mt-0.5" />;

  return (
    <section
      id="pricing"
      className="section-padding bg-muted/30 relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 text-center space-y-14 relative z-10">
        <div className="space-y-3 max-w-xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
            Travel Packages
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Choose the comfort level that best matches your family itinerary.
          </p>
        </div>

        <div className="grid gap-6 md:gap-8 md:grid-cols-3 md:items-stretch max-w-5xl mx-auto text-left">
          {/* Economy */}
          <Card className="card flex flex-col justify-between border-border/40 p-7 relative">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Economy
                </h3>
                <p className="text-sm text-muted-foreground">
                  Best value for money
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-xs text-muted-foreground">from</span>
                <span className="font-heading text-3xl font-semibold tracking-tight whitespace-nowrap">
                  ETB 150,000
                </span>
                <span className="text-xs text-muted-foreground">/ traveler</span>
              </div>
              <Separator className="opacity-60" />
              <ul className="space-y-3 text-muted-foreground">
                <li className={itemCls}>
                  {check}
                  <span>Ethiopian Airlines flight</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Standard accommodation</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Shared shuttle transport</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Umrah visa processing</span>
                </li>
              </ul>
            </div>
            <Link to={economySlug}>
              <Button
                variant="outline"
                className="w-full h-11 mt-8 text-sm font-semibold"
              >
                Explore Economy
              </Button>
            </Link>
          </Card>

          {/* Comfort — featured */}
          <Card className="card flex flex-col justify-between border-accent/50 bg-linear-to-b from-card to-accent/5 shadow-elevated ring-1 ring-accent/60 md:scale-105 z-10 relative p-7 overflow-visible">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <Badge className="bg-accent text-primary font-semibold py-1 px-4 border-none shadow-soft text-xs tracking-wider">
                Most Popular
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Comfort
                </h3>
                <p className="text-sm text-muted-foreground">
                  Optimal balance of service & price
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-xs text-muted-foreground">from</span>
                <span className="font-heading text-3xl font-semibold tracking-tight whitespace-nowrap text-primary">
                  ETB 180,000
                </span>
                <span className="text-xs text-muted-foreground">/ traveler</span>
              </div>
              <Separator className="opacity-60" />
              <ul className="space-y-3 text-foreground">
                <li className={itemCls}>
                  {check}
                  <span>Everything in Economy, plus</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Upgraded hotel</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Dedicated group guides & buses</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Full visa & ground coordination</span>
                </li>
              </ul>
            </div>
            <Link to={comfortSlug}>
              <Button className="w-full h-11 mt-8 text-sm font-semibold shadow-soft">
                Explore Comfort
              </Button>
            </Link>
          </Card>

          {/* Premium — dark luxury card */}
          <Card className="flex flex-col justify-between rounded-2xl border-none bg-primary p-7 relative text-primary-foreground dark:text-foreground shadow-elevated overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-star-pattern opacity-[0.07] pointer-events-none invert"
            />
            <div className="space-y-4 relative z-10">
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-semibold text-white">
                  Premium
                </h3>
                <p className="text-sm text-white/70">
                  Complete, unhurried premium care
                </p>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-xs text-white/60">from</span>
                <span className="font-heading text-3xl font-semibold tracking-tight whitespace-nowrap text-accent">
                  ETB 340,000
                </span>
                <span className="text-xs text-white/60">/ traveler</span>
              </div>
              <div className="h-px bg-white/15" />
              <ul className="space-y-3 text-white/85">
                <li className={itemCls}>
                  {check}
                  <span>Business class flights</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>5-star hotels on Haram courtyard</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>Private VIP transfers & visa queue skip</span>
                </li>
                <li className={itemCls}>
                  {check}
                  <span>1-on-1 dedicated tour guides</span>
                </li>
              </ul>
            </div>
            <Link to={premiumSlug} className="relative z-10">
              <Button
                variant="secondary"
                className="w-full h-11 mt-8 text-sm font-semibold bg-accent text-primary hover:bg-accent/90 border-none"
              >
                Explore Premium
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the call-to-action section for users interested in booking travel.
 *
 * @returns The CTA section component for the home page.
 *
 * @remarks
 * - Encourages visitors to submit their contact details for follow-up assistance.
 * - Provides a direct conversion point for travel package inquiries.
 */
export function CTA() {
  return (
    <section className="relative">
      <DomeDivider className="text-muted/30 dark:text-muted/20" />
      <div className="section-padding relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 z-10 relative">
          <div className="relative rounded-[2rem] border border-accent/25 bg-linear-to-t from-accent/10 to-card dark:from-primary/40 dark:to-card px-6 py-12 sm:px-10 md:p-16 text-center space-y-8 shadow-elevated overflow-hidden">
            {/* Kaaba ambience, heavily veiled */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
              <img
                src="/kaaba-tawaf.webp"
                alt=""
                loading="lazy"
                className="w-full h-full object-cover opacity-[0.08] dark:opacity-[0.12]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-card via-transparent to-card" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-star-pattern opacity-[0.05] pointer-events-none"
            />

            <div className="space-y-4 max-w-xl mx-auto relative z-10">
              <svg
                aria-hidden="true"
                viewBox="0 0 40 24"
                className="mx-auto h-6 w-10 text-accent"
                fill="none"
              >
                <path
                  d="M2 22 Q20 -4 38 22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="20" cy="9" r="2.5" fill="currentColor" />
              </svg>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Ready to book your travel?
              </h2>
              <p className="text-sm sm:text-base leading-7 text-muted-foreground">
                Register your interest and one of our dedicated travel
                coordinators will reach out to build your custom itinerary.
              </p>
            </div>

            <div className="flex justify-center relative z-10">
              <Suspense
                fallback={
                  <div className="flex w-full max-w-md gap-3">
                    <div className="h-11 flex-1 animate-pulse rounded-xl bg-muted/30" />
                    <div className="h-11 w-32 animate-pulse rounded-xl bg-muted/30" />
                  </div>
                }
              >
                <InlineCallbackForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
