// import { ArrowRightIcon } from '@phosphor-icons/react';
// import { Badge, Button } from '@kafi/ui';
// import { Link } from 'react-router';

// export function ServicesCTA() {
//   return (
//     <div
//       id="pricing-anchor"
//       className="relative mt-20 overflow-hidden rounded-3xl border border-accent/25 bg-linear-to-br from-accent/15 via-background to-accent/5 px-6 py-12 text-center shadow-elevated md:p-16"
//     >
//       <div className="relative z-10 mx-auto max-w-xl space-y-4">
//         <Badge
//           variant="outline"
//           className="border-accent/30 bg-accent/5 px-3 py-0.5 text-xs font-bold text-accent"
//         >
//           Start Booking
//         </Badge>

//         <h3 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
//           Pilgrimages Tailored for You
//         </h3>

//         <p className="text-base font-light leading-relaxed text-muted-foreground">
//           Ready to book? Browse our bundled packages or call us directly to
//           design a custom group itinerary.
//         </p>
//       </div>

//       <div className="relative z-10 mx-auto flex max-w-md flex-col justify-center gap-4 sm:flex-row">
//         <Link to="/packages" className="w-full sm:w-auto">
//           <Button className="btn-primary flex h-12 w-full items-center justify-center gap-2 px-8 text-sm shadow-soft">
//             Browse Packages
//             <ArrowRightIcon weight="bold" className="h-4 w-4" />
//           </Button>
//         </Link>

//         <Link to="/contact" className="w-full sm:w-auto">
//           <Button
//             variant="ghost"
//             className="btn-outline flex h-12 w-full items-center justify-center px-8 text-sm"
//           >
//             Contact Us
//           </Button>
//         </Link>
//       </div>
//     </div>
//   );
// }

import { ArrowRightIcon } from '@phosphor-icons/react';
import { Button, Card } from '@kafi/ui';
import { Link } from 'react-router';

export function ServicesCTA() {
  return (
    <Card
      id="pricing-anchor"
      className="mt-16 border-border/40 bg-linear-to-b from-accent/0 to-accent/10 p-6 shadow-elevated backdrop-blur-md sm:p-8"
    >
      <div className="flex flex-col gap-6  md:items-center md:justify-between">
        {/* Content */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Start Booking
          </span>

          <h3 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Pilgrimages Tailored for You
          </h3>

          <p className="max-w-xl text-sm font-light leading-relaxed text-muted-foreground">
            Browse our bundled packages or contact us to design a custom group
            itinerary.
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link to="/contact">
            <Button
              size={'lg'}
              className="btn-primary h-10 w-full gap-2 px-5 sm:text-lg sm:w-48 hover:scale-105"
            >
              Book Now
              <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
