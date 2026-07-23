import { ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { Badge, Button, Card } from "@kafi/ui";
import { Link } from "react-router";

/**
 * Renders the custom-package call-to-action on the packages listing page.
 *
 * @returns The custom package CTA.
 *
 * @remarks
 * - Catches pilgrims whose needs don't fit the three standard tiers.
 * - Routes to /contact for a personalised itinerary conversation.
 */
export function PackageCTA() {
  return (
    <Card className="card relative overflow-hidden border-accent/25 bg-linear-to-b from-accent/10 to-background p-8 text-center shadow-elevated md:p-16">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-accent/30 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
          >
            <SparkleIcon weight="fill" className="h-3.5 w-3.5" />
            Custom Itineraries
          </Badge>

          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Need a Custom or Group Package?
          </h2>

          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Travelling with a large family, group, or have specific dates and hotel preferences? Our
            team will build a tailored itinerary for you.
          </p>
        </div>

        <Link to="/enquiry?topic=custom-package">
          <Button className="btn-primary h-11 px-8 text-sm">
            Request Custom Package
            <ArrowRightIcon weight="bold" className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
