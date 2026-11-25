import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';

import type { ServiceItem } from '../types/service.types';

interface ServiceCardProps {
  service: ServiceItem;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const Icon = service.icon;

  return (
    <Link
      to={`/services/${service.slug}`}
      className="card group relative flex flex-col border-border/40 p-6 text-left transition-all duration-300 hover:border-accent/40 hover:shadow-elevated hover:-translate-y-1"
    >
      {/* Icon chip */}
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/15 bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent/15 group-hover:scale-110">
        <Icon weight="duotone" className="h-5 w-5" />
      </div>

      <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
        {service.name}
      </h2>

      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
        {service.tagline}
      </p>

      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
        {service.description}
      </p>

      {/* Footer */}
      <div className="mt-5 flex items-center gap-2 border-t border-border/40 pt-4">
        <span className="text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-accent">
          View details
        </span>
        <ArrowRightIcon
          weight="bold"
          className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
    </Link>
  );
}
