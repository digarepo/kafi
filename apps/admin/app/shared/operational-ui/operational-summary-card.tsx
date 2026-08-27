import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2, CircleAlert, Info } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from '@kafi/ui';
import { Link } from 'react-router';
import type { ReactNode } from 'react';

export type OperationalSummaryCardTone =
  'neutral' | 'success' | 'warning' | 'info' | 'danger';

interface OperationalSummaryCardProps {
  title: string;
  value: ReactNode;
  secondary?: ReactNode;
  tone?: OperationalSummaryCardTone;
  icon?: LucideIcon;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

const tonePresentation: Record<
  OperationalSummaryCardTone,
  { className: string; icon: LucideIcon | null }
> = {
  neutral: { className: 'text-foreground', icon: null },
  success: {
    className: 'text-success',
    icon: CheckCircle2,
  },
  warning: {
    className: 'text-warning',
    icon: CircleAlert,
  },
  info: {
    className: 'text-info',
    icon: Info,
  },
  danger: {
    className: 'text-destructive',
    icon: CircleAlert,
  },
};

export function OperationalSummaryCard({
  title,
  value,
  secondary,
  tone = 'neutral',
  icon: Icon,
  action,
  className,
}: OperationalSummaryCardProps) {
  const toneConfig = tonePresentation[tone];
  const ToneIcon = toneConfig.icon;

  return (
    <Card size="sm" className={cn('min-w-0', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate">{title}</CardTitle>
          {secondary && <CardDescription>{secondary}</CardDescription>}
        </div>
        {(Icon || ToneIcon) && (
          <div className={cn('shrink-0', toneConfig.className)}>
            {Icon ? (
              <Icon className="h-4 w-4" aria-hidden="true" />
            ) : (
              ToneIcon && <ToneIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className={cn('space-y-3', toneConfig.className)}>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
      </CardContent>
      {action && (
        <CardFooter className="mt-auto justify-start border-t-0 bg-transparent pt-0">
          {action.href ? (
            <Button variant="link" size="sm" render={<Link to={action.href} />}>
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="link" size="sm" onClick={action.onClick}>
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
