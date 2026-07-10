import { Button, Card, Badge, Separator, TypingAnimation } from '@kafi/ui';
import { SparkleIcon, AirplaneIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';

/**
 * Renders the landing page hero section with travel highlights and departure information.
 *
 * @returns The hero section component for the home page.
 *
 * @remarks
 * - Displays the primary marketing message and call-to-action.
 * - Presents a visual flight preview card highlighting Hajj and Umrah travel services.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden min-h-[92vh] flex items-center pt-24 pb-16"
    >
      <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-12 grid gap-12 lg:grid-cols-12 lg:items-center relative z-10">
        {/* Left Side Content */}
        <div className="space-y-8 lg:col-span-6 text-left">
          <Badge
            variant="outline"
            className="px-3.5 py-1 text-xs border-accent/20 bg-accent/5 text-accent font-semibold flex items-center gap-1.5 w-fit"
          >
            <SparkleIcon weight="fill" className="w-3.5 h-3.5 text-accent" />
            Umrah Flights
          </Badge>

          <div className="space-y-4">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-[1.1] text-foreground">
              A Spiritual Journey <br />
              <span className="text-primary">
                <TypingAnimation
                  words={['Perfected In Comfort', 'Designed For You']}
                  loop
                  typeSpeed={150}
                  deleteSpeed={30}
                  pauseDelay={2000}
                />
              </span>
            </h1>
            <p className="max-w-xl text-sm sm:text-md text-muted-foreground font-light leading-relaxed">
              We align premium accommodation and travel schedules in
              coordination with{' '}
              <span className="text-accent font-semibold">
                Ethiopian Airlines
              </span>{' '}
              to support Hajj & Umrah pilgrimages.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/packages">
              <Button className="btn-primary py-3 px-6 h-12 text-sm shadow-soft">
                Explore Packages
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Side Minimalistic Visual Card */}
        <div className="lg:col-span-6 flex justify-center items-center">
          <Card className="card w-full max-w-105 shadow-elevated border-border/40 bg-linear-to-b from-accent/0 to-accent/10 backdrop-blur-md p-6">
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent uppercase tracking-widest font-semibold">
                    Next Departure
                  </span>
                  <h3 className="font-heading text-md font-bold text-foreground">
                    Addis Ababa Hub
                  </h3>
                </div>
                <div className="p-2 rounded-full bg-accent/10 text-accent">
                  <AirplaneIcon weight="light" className="w-7 h-7 rotate-45" />
                </div>
              </div>

              {/* Stretched mini flights preview */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-light text-muted-foreground">
                  <span>Flight Status</span>
                  <span>ET 501 • Confirmed</span>
                </div>
                <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border/40">
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground">ADD</p>
                    <p className="text-xs font-bold">Addis Ababa</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center px-4">
                    <span className="text-[9px] text-accent font-semibold">
                      Direct Route
                    </span>
                    <div className="w-full h-px bg-border relative my-1">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">JED</p>
                    <p className="text-xs font-bold">Jeddah</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/10">
                  <p className="text-[9px] text-muted-foreground">
                    Makkah Hotel
                  </p>
                  <p className="font-bold text-[11px] text-primary truncate">
                    Fairmont
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/10">
                  <p className="text-[9px] text-muted-foreground">
                    Madinah Hotel
                  </p>
                  <p className="font-bold text-[11px] text-primary truncate">
                    Oberoi
                  </p>
                </div>
                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/10">
                  <p className="text-[9px] text-muted-foreground">Services</p>
                  <p className="font-bold text-[11px] text-accent">VIP Group</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
