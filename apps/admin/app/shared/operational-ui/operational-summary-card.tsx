import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2, CircleAlert, Info } from 'lucide-react';
import {
  buttonVariants,
  Button,
  Card,
  CardContent,
  CardDescription,
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
        {action &&
          (action.href ? (
            <Link
              to={action.href}
              className={buttonVariants({
                variant: 'link',
                size: 'sm',
                className: 'h-auto gap-1 px-0',
              })}
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <Button
              variant="link"
              size="sm"
              className="h-auto gap-1 px-0"
              onClick={action.onClick}
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
