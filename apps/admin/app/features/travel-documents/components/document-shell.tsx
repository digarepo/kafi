import type { ReactNode } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kafi/ui';
import type { TravelDocumentWarning } from '../../../lib/api.js';

export function formatDocumentDate(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDocumentDateTime(
  value: string | null | undefined,
): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : 'Not available';
}

export function DocumentShell({
  title,
  subtitle,
  backTo,
  generatedAt,
  headerRight,
  children,
}: {
  title: string;
  subtitle: string;
  backTo: string;
  generatedAt: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="travel-document-page space-y-3 pb-6">
      <div className="document-toolbar flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-muted-foreground"
          render={<Link to={backTo} />}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      <article className="document-surface mx-auto w-full max-w-[210mm] rounded-xl border bg-background p-[15mm] shadow-sm">
        <header className="document-header border-b pb-2.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Kafi Tours
              </p>
              <h1 className="mt-1 text-[13.5pt] font-semibold leading-tight tracking-tight">
                {title}
              </h1>
              <p className="mt-0.5 text-[11pt] text-muted-foreground">
                {subtitle}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {headerRight ?? (
                <>
                  <p>Generated</p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {formatDocumentDateTime(generatedAt)}
                  </p>
                </>
              )}
            </div>
          </div>
        </header>
        {children}
      </article>
    </div>
  );
}

export function DocumentSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`document-section space-y-1.5 ${className ?? ''}`}>
      <h2 className="border-b pb-1 text-[12.5pt] font-semibold uppercase tracking-[0.12em] text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DocumentField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[11pt] font-medium">{value}</dd>
    </div>
  );
}

export function DocumentWarnings({
  warnings,
}: {
  warnings: TravelDocumentWarning[];
}) {
  if (warnings.length === 0) return null;
  return (
    <Card className="document-warning border-warning/40 bg-warning/5 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-warning">
          Review before printing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {warnings.map((warning) => (
          <p key={warning.code} className="text-warning-foreground">
            {warning.message}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export function DocumentStatus({
  value,
  variant = 'secondary',
}: {
  value: string | null | undefined;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'outline';
}) {
  return <Badge variant={variant}>{displayValue(value)}</Badge>;
}

export function DocumentLoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
      Loading document…
    </div>
  );
}

export function DocumentErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
