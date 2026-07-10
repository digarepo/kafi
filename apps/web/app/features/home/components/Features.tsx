import { Badge, Button, Card, Input, Separator } from '@kafi/ui';
import {
  ArrowRightIcon,
  AirplaneIcon,
  StarIcon,
  UsersIcon,
  ShieldCheckIcon,
  CheckIcon,
  PhoneCallIcon,
} from '@phosphor-icons/react';
import { Link } from 'react-router';

/**
 * Renders the partnerships section showcasing trusted travel and pilgrimage partners.
 *
 * @returns The partners section component for the home page.
 *
 * @remarks
 * - Highlights organizations that support Kafi Tours' Hajj and Umrah services.
 * - Reinforces trust through official partner branding and messaging.
 */
export function Partners() {
  return (
    <section className="py-12 border-t border-b border-border/30 bg-background/50 relative z-10">
      <div className="mx-auto container px-6 sm:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-evenly gap-8 text-center md:text-left">
        <div>
          <h3 className="font-heading text-xs font-bold text-brand-light dark:text-brand-gold uppercase tracking-wider">
            In Partnership With
          </h3>
          <p className="text-[12px] text-muted-foreground font-light mt-0.5">
            Securing safe flights and premium logistics for all pilgrims.
          </p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-70  hover:grayscale-0 transition-all duration-300">
          <img src="/et-large.svg" className="h-20" />

          <img src="/hajj-ministry.svg" className="h-20" />
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the destinations section highlighting the primary pilgrimage locations and travel routes.
 *
 * @returns The destinations section component for the home page.
 *
 * @remarks
 * - Showcases Makkah and Madinah as the primary pilgrimage destinations.
 * - Highlights Ethiopian Airlines as the primary departure partner from Addis Ababa.
 */

export function Destinations() {
  return (
    <section
      id="destinations"
      className="section-padding bg-muted/30 border-t border-border/20"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 space-y-16">
        {/* Title */}
        <div className="space-y-3 max-w-xl text-left">
          <Badge
            variant="outline"
            className="px-3 py-0.5 border-accent/20 text-accent bg-accent/5 font-semibold"
          >
            Spiritual Centerpoints
          </Badge>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Travel Destinations
          </h2>
          <p className="text-muted-foreground font-light text-sm">
            Curated packages utilizing high-quality logistics and luxury
            boarding parameters.
          </p>
        </div>

        {/* Staggered Masonry Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Card 1: Makkah (Large Showcase, spans 7 columns) */}
          <Card className="card card-hover lg:col-span-7 overflow-hidden border-border/30 bg-card flex flex-col justify-between min-h-100 relative">
            <div className="absolute inset-0 z-0">
              <img
                src="hero-mecca.webp"
                alt="Makkah"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            <div className="absolute top-4 left-4 z-10">
              <Badge className="bg-accent/60 text-primary font-semibold py-1 px-3 border-none">
                Umrah Experience
              </Badge>
            </div>

            <div className="z-10 mt-auto p-6 space-y-3 max-w-xl text-left">
              <h3 className="font-heading text-2xl font-bold tracking-tight text-primary-foreground">
                Makkah Al-Mukarramah
              </h3>
              <p className="text-sm text-accent-foreground font-light leading-relaxed">
                Perform your umrah with thoughtfully arranged accomodation near
                al-masjid Al-Haram, Allowing you to focus on your worship with
                convenience.
              </p>
              <div className="flex gap-4 text-xs font-semibold text-accent">
                <span>✓ Carefully Selected Accommodations</span>
                <span>✓ Convenient Ground Transportation</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Madinah (Vertical Layout, spans 5 columns) */}
          <Card className="card card-hover lg:col-span-5 overflow-hidden border-border/30 bg-card flex flex-col justify-between min-h-100 relative">
            <div className="absolute inset-0 z-0">
              <img
                src="madinah.webp"
                alt="Madinah"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            <div className="absolute top-4 left-4 z-10">
              <Badge className="bg-primary/50 text-accent font-semibold py-1 px-3 border-none">
                city of the Prophet
              </Badge>
            </div>

            <div className="z-10 mt-auto p-6 space-y-3 text-left">
              <h3 className="font-heading text-xl font-bold tracking-tight text-primary-foreground">
                Al-Madinah Al-Munawwarah
              </h3>
              <p className="text-sm text-accent-foreground font-light leading-relaxed">
                Visit the Prophet’s Mosque (Al-Masjid an-Nabawi) and trace
                historical landmarks in peaceful guided groups.
              </p>
            </div>
          </Card>

          {/* Card 3: Hub Banner (Horizontal Banner, spans all 12 columns) */}
          <Card className="card card-hover lg:col-span-12 overflow-hidden border-border/30 bg-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 min-h-60 relative">
            <div className="absolute inset-0 z-0 opacity-35">
              <img
                src="addis-departure.webp"
                alt="Ethiopian Airlines Aircraft"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="z-10 flex flex-col md:flex-row items-center gap-6 relative text-left">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <AirplaneIcon weight="light" className="w-6 h-6 rotate-45" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-accent font-bold uppercase tracking-wider">
                  Flight Partner
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Ethiopian Airlines
                </h3>
                <p className="text-sm text-foreground/70 font-normal max-w-2xl leading-relaxed">
                  We coordinate direct Ethiopian Airlines flights from Addis
                  Ababa (ADD) to Jeddah (JED), helping ensure a comfortable and
                  well-organized start to your pilgrimage.
                </p>
              </div>
            </div>
          </Card>
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
 * - Emphasizes convenience, guidance, and coordinated pilgrimage logistics.
 */
export function Features() {
  const items = [
    {
      icon: <StarIcon weight="light" className="w-5 h-5 text-accent" />,
      title: 'Carefully Selected Accommodation',
      desc: 'Comfortable hotel accommodations chosen for quality, convenience, and proximity to the Haram where available.',
    },
    {
      icon: (
        <AirplaneIcon
          weight="light"
          className="w-5 h-5 text-accent rotate-45"
        />
      ),
      title: 'Flight Coordination',
      desc: 'Travel arrangements coordinated with Ethiopian Airlines to help provide a smooth journey from departure to arrival.',
    },
    {
      icon: <UsersIcon weight="light" className="w-5 h-5 text-accent" />,
      title: 'Guidance Throughout Your Journey',
      desc: 'Support before and during your pilgrimage with organized briefings and experienced group coordinators.',
    },
    {
      icon: <ShieldCheckIcon weight="light" className="w-5 h-5 text-accent" />,
      title: 'Visa & Travel Assistance',
      desc: 'Assistance with visa processing and the required travel documentation for your pilgrimage.',
    },
  ];

  return (
    <section
      id="features"
      className="section-padding border-t border-border/20"
    >
      <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-12 grid gap-12 lg:grid-cols-12 lg:items-center">
        {/* Left Side Content Panel */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <Badge
            variant="outline"
            className="px-3 py-0.5 bg-accent/5 border-primary/20 text-primary"
          >
            Handling your Umrah
          </Badge>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Why Travelers Choose <br />
            <span className="font-bold text-primary">KAFI </span>
            <span className="text-accent font-normal">TOURS</span>
          </h2>
          <p className="text-muted-foreground font-light text-sm leading-relaxed">
            Every pilgrimage deserves careful planning. We coordinate flights,
            accommodation, transportation, and essential travel arrangements so
            you can devote more of your attention to worship and less to
            logistics.
          </p>
          <div className="pt-2">
            <Link to="/services">
              <Button
                className="btn-outline flex items-center gap-2 text-xs hover:scale-110"
                variant={'outline'}
              >
                Discover Our Services
                <ArrowRightIcon weight="regular" className="w-3.5 h-3.5 " />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side Cards with Gradients & Animations */}
        <div className="lg:col-span-7 grid gap-6 sm:grid-cols-2">
          {items.map((feat, i) => (
            <Card
              key={i}
              className="card group p-6 border-border/40 hover:border-accent/30 transition-all duration-300 bg-linear-to-b from-card/80 via-card/50 to-primary/5 hover:shadow-md text-left"
            >
              {/* Icon with Gold styling and scaling on card hover */}
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 border border-accent/15 group-hover:scale-110 transition-transform duration-300">
                {feat.icon}
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground mb-1">
                {feat.title}
              </h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
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
 * Renders the pricing section showcasing the available pilgrimage packages.
 *
 * @returns The pricing section component for the home page.
 *
 * @remarks
 * - Presents Economy, Comfort, and Premium package options.
 * - Highlights the Comfort package as the recommended choice for most travelers.
 */
export function Pricing() {
  return (
    <section
      id="pricing"
      className="section-padding bg-muted/20 border-t border-border/20"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 text-center space-y-16">
        {/* Title */}
        <div className="space-y-3 max-w-xl mx-auto">
          <Badge
            variant="outline"
            className="px-3 py-0.5 border-accent/20 text-accent bg-accent/5 font-semibold"
          >
            Clear Pricing
          </Badge>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Pilgrimage Packages
          </h2>
          <p className="text-muted-foreground font-light text-sm">
            Choose the package comfort level that best matches your family
            itinerary.
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid gap-8 md:grid-cols-3 md:items-stretch max-w-5xl mx-auto text-left">
          {/* 1. Economy Package */}
          <Card className="card flex flex-col justify-between border-border/30 bg-linear-to-b from-card to-muted/10 p-6 relative">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Economy Package
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Best vaue for money
                </p>
              </div>
              <div className="flex items-baseline gap-1 text-foreground">
                <span className="text-2xl font-bold">ETB 145,000</span>
                <span className="text-[10px] text-muted-foreground font-light">
                  / traveler
                </span>
              </div>
              <Separator className="opacity-60" />
              <ul className="space-y-3 text-xs text-muted-foreground font-light">
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Ethiopian Airlines flight</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Standard accomodation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Shared shuttle transports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Umrah visa processing</span>
                </li>
              </ul>
            </div>
            <Link to={'/contact'}>
              <Button
                variant={'outline'}
                className="w-full btn-outline h-10 mt-8 text-xs"
              >
                Select Economy
              </Button>
            </Link>
          </Card>

          {/* 2. Comfort Package (Popular - Standing Out with Gold Accents) */}
          <Card className="card flex flex-col justify-between border-accent/40 bg-linear-to-b from-card to-accent/5 shadow-soft shadow-accent/5 ring-1 ring-accent scale-100 md:scale-105 z-10 relative p-6 overflow-visible">
            {/* Floating Popular Badge - Fixed Layout (floats halfway above top border) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <Badge className="bg-accent text-primary-foreground font-medium py-1 px-3.5 border-none shadow-soft text-xs tracking-wider ">
                Most Popular
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Comfort Package
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Optimal balance of service & price
                </p>
              </div>
              <div className="flex items-baseline gap-1 text-foreground">
                <span className="text-2xl font-bold text-primary">
                  ETB 160,000
                </span>
                <span className="text-[10px] text-muted-foreground font-light">
                  / traveler
                </span>
              </div>
              <Separator className="opacity-60" />
              <ul className="space-y-3 text-xs text-foreground font-light">
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Everything in Economy plus</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Upgraded Hotel</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Dedicated group guides & buses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Full visa & ground coordination</span>
                </li>
              </ul>
            </div>
            <Link to={'/contact'}>
              <Button className="w-full btn-primary h-10 mt-8 text-xs shadow-soft">
                Select Comfort
              </Button>
            </Link>
          </Card>

          {/* 3. Premium Package (Luxurious Dark Theme Option) */}
          <Card className="card flex flex-col justify-between border-border/30 bg-linear-to-b from-card to-muted/10 p-6 relative">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Premium Package
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Ultimate luxury spiritual experience
                </p>
              </div>
              <div className="flex items-baseline gap-1 text-foreground">
                <span className="text-[10px]">starting from </span>
                <span className="text-2xl text-brand-gold font-bold">
                  ETB 240,000
                </span>
                <span className="text-[10px] text-muted-foreground font-light">
                  / traveler
                </span>
              </div>
              <Separator className="opacity-60" />
              <ul className="space-y-3 text-xs text-muted-foreground font-light">
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Business Class Flights</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>5-Star Hotels directly on Haram Courtyard</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>Private VIP transfers & visa queue skip</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-primary w-4 h-4 shrink-0" />
                  <span>1-on-1 dedicated tour guides</span>
                </li>
              </ul>
            </div>
            <Link to={'/contact'}>
              <Button
                variant={'outline'}
                className="w-full btn-outline h-10 mt-8 text-xs"
              >
                Select Premium
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the call-to-action section for users interested in booking a pilgrimage.
 *
 * @returns The CTA section component for the home page.
 *
 * @remarks
 * - Encourages visitors to submit their contact details for follow-up assistance.
 * - Provides a direct conversion point for pilgrimage package inquiries.
 */
export function CTA() {
  return (
    <section className="section-padding relative overflow-hidden border-t border-border/20">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 z-10 relative">
        {/* Applied Warm Gold Gradient & Border */}
        <div className="card bg-linear-to-t from-accent/15 to-background dark:bg-linear-to-b dark:from-primary/90 dark:to-muted border border-accent/25 px-8 py-12 md:p-16 text-center space-y-8 shadow-elevated overflow-hidden relative">
          <div className="space-y-4 max-w-xl mx-auto">
            <Badge
              variant="outline"
              className="px-3 py-0.5 border-accent/30 text-accent bg-accent/5 font-semibold"
            >
              Begin Your Journey
            </Badge>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Ready to Book Your Pilgrimage?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
              Register your interest and one of our dedicated spiritual travel
              coordinators will reach out to build your custom itinerary.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto relative z-10">
            <Input
              type="email"
              placeholder="Enter your email address"
              className="px-4 py-3 border-border rounded-xl text-xs h-11 focus:ring-accent/20 bg-background/50"
            />
            <Link to={'/contact'}>
              <Button className="hover:scale-110 py-3 px-6 h-11 flex items-center justify-center gap-2 whitespace-nowrap text-xs shadow-soft dark:bg-accent">
                Request Callback
                <PhoneCallIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
