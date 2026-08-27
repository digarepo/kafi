import { useEffect, useState } from 'react';
import { api, type FinanceDashboardSummary } from '../../../lib/api.js';

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string;
  variant?: 'default' | 'positive' | 'negative';
}) {
  const color =
    variant === 'positive'
      ? 'text-green-600'
      : variant === 'negative'
        ? 'text-red-600'
        : 'text-foreground';
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function FinanceDashboardPage() {
  const [summary, setSummary] = useState<FinanceDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await api.getFinanceDashboard();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error)
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  if (!summary) return null;

  const fmt = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of revenue, expenses, and profitability.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={fmt(summary.total_revenue)} />
        <StatCard label="Cash Collected" value={fmt(summary.total_collected)} />
        <StatCard label="Outstanding" value={fmt(summary.outstanding)} variant="negative" />
        <StatCard label="Total Expenses" value={fmt(summary.total_expenses)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Profit / Loss"
          value={fmt(summary.profit_loss)}
          variant={summary.profit_loss >= 0 ? 'positive' : 'negative'}
        />
        <StatCard label="Total Refunds" value={fmt(summary.total_refunds)} variant="negative" />
        <StatCard label="Authorized Credit" value={fmt(summary.authorized_credit)} />
      </div>
    </div>
  );
}
