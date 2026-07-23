import { AirplaneIcon, ArrowRightIcon, PhoneIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import { Button, Card, Separator } from "@kafi/ui";

import type { PackageItem } from "../types/package.types";

interface PackageBookingCardProps {
  package: PackageItem;
}

/**
 * Renders the sticky booking card on the package detail page.
 *
 * @returns The booking card component.
 *
 * @remarks
 * - Single responsibility: price, primary actions, and a contact path.
 * - Inspired by the home hero flight-preview card and the services "How it
 *   works" card — a compact route motif (Addis Ababa → Jeddah) anchors the top,
 *   followed by price, actions, trust, and a phone contact.
 */
export function PackageBookingCard({ package: pkg }: PackageBookingCardProps) {
  return (
    <Card className="card w-full max-w-105 overflow-hidden border-border/40 bg-linear-to-b from-accent/0 to-accent/10 p-6 shadow-elevated backdrop-blur-md">
      <div className="space-y-5">
        {/* Route motif */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
              {pkg.name} Journey
            </span>

            <h3 className="font-heading text-sm font-bold text-foreground">Start Your Journey</h3>
          </div>

          <div className="rounded-full bg-accent/10 p-2 text-accent">
            <AirplaneIcon weight="light" className="h-6 w-6 rotate-45" />
          </div>
        </div>

        {/* Flight route */}
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/40 p-3">
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground">ADD</p>
            <p className="text-xs font-bold text-foreground">Addis Ababa</p>
          </div>

          <div className="flex flex-1 flex-col items-center px-4">
            <span className="text-[9px] font-semibold text-accent">Direct Route</span>

            <div className="relative my-1 h-px w-full bg-border">
              <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">JED</p>
            <p className="text-xs font-bold text-foreground">Jeddah</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight text-primary">{pkg.price}</span>

          <span className="text-[10px] font-light text-muted-foreground">/ traveler</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link to={`/booking?package=${pkg.slug}`} className="block">
            <Button className="btn-primary h-12 w-full text-sm">
              Book This Package
              <ArrowRightIcon weight="bold" className="h-4 w-4" />
            </Button>
          </Link>

          <Link to={`/enquiry?package=${pkg.slug}`} className="block">
            <Button variant="outline" className="btn-outline h-12 w-full text-sm">
              Ask a Question
            </Button>
          </Link>
        </div>

        {/* Trust line */}
        <div className="flex items-start gap-2.5 rounded-xl bg-muted/30 p-3">
          <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />

          <p className="text-xs font-light leading-relaxed text-muted-foreground">
            No payment required to enquire. Our team will confirm availability and tailor the
            details with you.
          </p>
        </div>

        <Separator />

        {/* Contact */}
        <a href="tel:+251111262965" className="group flex items-center gap-3">
          <div className="rounded-full bg-accent/10 p-2.5 text-accent transition-colors group-hover:bg-accent/20">
            <PhoneIcon className="h-4 w-4" />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Prefer to speak with us?
            </p>

            <p className="mt-1 text-sm font-semibold text-foreground transition-colors group-hover:text-accent">
              +251 111 262 965
            </p>
          </div>
        </a>
      </div>
    </Card>
  );
}
