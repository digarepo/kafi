import { ArrowRightIcon } from '@phosphor-icons/react';
import { Card, Separator } from '@kafi/ui';
import { Link } from 'react-router';

import type { ServiceItem } from '../types/service.types';

interface ServiceCardProps {
  service: ServiceItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const Icon = service.icon;

  return (
    <Card className="group border-border/40 bg-linear-to-b from-accent/5 to-primary/5 p-6 shadow-soft backdrop-blur-md transition-all duration-300 hover:border-accent/30 hover:shadow-elevated">
      <Link to={`/services/${service.slug}`} className="block">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
                {service.name}
              </h2>
            </div>

            <div className="shrink-0 rounded-full bg-accent/10 p-2.5 text-accent transition-transform duration-300 group-hover:scale-110">
              <Icon weight="light" className="h-6 w-6" />
            </div>
          </div>

          {/* Tagline */}
          <p className="text-xs font-semibold tracking-wider text-accent">
            {service.tagline}
          </p>

          {/* Description */}
          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            {service.description}
          </p>

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary transition-colors duration-200 group-hover:text-accent">
              View Details
            </span>

            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all duration-300 group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent">
              <ArrowRightIcon
                weight="bold"
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
