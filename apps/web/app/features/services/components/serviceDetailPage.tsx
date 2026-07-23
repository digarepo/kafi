/**
 * Service detail presentation page for Kafi Tours.
 *
 * @remarks
 * - **Scope:** customer
 * - **Authority:** Kafi Tours Travel Services
 */
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PhoneCallIcon } from "@phosphor-icons/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  Separator,
} from "@kafi/ui";

import { services } from "../data/services";

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const otherServices = services.filter((item) => item.slug !== service.slug).slice(0, 3);

  const trustPoints = [
    "Licensed & government approved operations",
    "10+ years of pilgrimage logistics support",
    "24/7 dedicated support team in KSA",
    "High satisfaction rates from returning pilgrims",
    "Transparent pricing — no hidden fees",
    "Full package refund guarantee policies",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-28 sm:px-8 lg:px-12">
        {/* Back Navigation */}
        <Link
          to="/services"
          className="mb-10 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground transition-colors hover:text-accent"
        >
          <ArrowLeftIcon weight="bold" className="h-3.5 w-3.5" />
          Back to Services
        </Link>

        {/* Page Header */}
        <header className="mb-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            {/* Main Identity */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-[1.1] text-foreground">
                  {service.name}
                </h1>

                <p className="text-xs font-medium tracking-wider text-accent">{service.tagline}</p>
              </div>
            </div>

            {/* Service Number / Category */}
            <div className=" hidden sm:block text-left md:text-right">
              <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                Kafi Service
              </span>

              <p className="mt-1 text-sm font-semibold text-foreground">
                Travel & Pilgrimage Support
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          {/* Main Column */}
          <main className="space-y-14 lg:col-span-8">
            {/* About */}
            <section className="space-y-4">
              <SectionLabel>About This Service</SectionLabel>

              <p className="max-w-3xl text-sm font-light leading-relaxed text-muted-foreground sm:text-md">
                {service.details}
              </p>
            </section>

            <Separator />

            {/* Process */}
            <section className="space-y-6">
              <SectionLabel>How We Help You</SectionLabel>

              <Accordion defaultValue={["step-0"]} className="w-full">
                {service.steps.map((step, index) => (
                  <AccordionItem key={step.title} value={`step-${index}`}>
                    <AccordionTrigger className={"border-none h-16"}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="text-left">{step.title}</span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <p className="pl-10 pr-8 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <Separator />

            {/* Trust */}
            <section className="space-y-6">
              <SectionLabel>Why Trust Kafi Tours</SectionLabel>

              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckIcon weight="regular" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                    <span className="text-sm font-light leading-relaxed text-muted-foreground">
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {/* Action Card */}
          <aside className="lg:sticky lg:top-24 lg:col-span-4">
            <Card className="border-border/40 bg-linear-to-b from-accent/0 to-accent/10 p-6 shadow-elevated backdrop-blur-md sm:p-8">
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                  <span className="text-[10px] font-medium tracking-widest text-accent">
                    Start Planning
                  </span>

                  <h2 className="font-heading text-lg font-bold text-foreground">
                    Get This Service
                  </h2>

                  <p className="text-sm font-light leading-relaxed text-muted-foreground">
                    This service is available as part of our customizable pilgrimage packages.
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Link to={`/enquiry?service=${service.slug}`} className="block">
                    <Button className="btn-primary flex h-11 w-full items-center justify-center gap-2 text-sm hover:scale-105">
                      Get Help With This Service
                      <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  <Link to="/packages" className="block">
                    <Button variant="outline" className="h-11 w-full text-xs">
                      Browse packages
                    </Button>
                  </Link>
                </div>

                <Separator />

                {/* Concierge */}
                <a href="tel:+251111262965" className="group flex items-center gap-3">
                  <div className="rounded-full bg-accent/10 p-2.5 text-primary transition-colors group-hover:bg-accent/20">
                    <PhoneCallIcon weight="light" className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[10px] font-medium tracking-widest text-muted-foreground">
                      or, give us a call
                    </p>

                    <p className="mt-0.5 text-sm font-bold text-foreground transition-colors group-hover:text-accent">
                      +251 111 262 965
                    </p>
                  </div>
                </a>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Other Services */}
      <section className="border-t border-border/20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
          <div className="mb-8">
            <SectionLabel>Explore More</SectionLabel>

            <h2 className="mt-2 font-heading text-xl font-bold text-foreground">Other Services</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {otherServices.map((otherService) => {
              const OtherIcon = otherService.icon;

              return (
                <Link key={otherService.id} to={`/services/${otherService.slug}`} className="group">
                  <Card className="h-full border-border/40 bg-linear-to-b from-accent/0 to-accent/10 p-6 shadow-soft transition-all duration-300 hover:border-accent/30 hover:shadow-elevated">
                    <div className="flex h-full flex-col justify-between gap-8">
                      <div className="flex items-start justify-between">
                        <div className="rounded-full bg-accent/10 p-2.5 text-accent transition-transform duration-300 group-hover:scale-110">
                          <OtherIcon weight="light" className="h-5 w-5" />
                        </div>

                        <ArrowRightIcon
                          weight="bold"
                          className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent"
                        />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-heading text-sm font-bold text-foreground">
                          {otherService.name}
                        </h3>

                        <p className="text-xs font-light text-muted-foreground">
                          {otherService.tagline}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
}

function SectionLabel({ children }: SectionLabelProps) {
  return <span className="text-[10px] font-semibold tracking-widest text-accent">{children}</span>;
}
