import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CircleDollarSign,
  Loader,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@kafi/ui";
import {
  api,
  type FinanceDashboardSummary,
  type TravelGroupListItem,
  type TravelRound,
} from "../../../lib/api.js";
import { displayDate } from "../../operations/lib/date";

function formatMoney(value: number): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

function LoadingValue({ small = false }: { small?: boolean }) {
  return (
    <Loader className={`${small ? "h-4 w-4" : "h-6 w-6"} animate-spin`} aria-label="Loading" />
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  loading,
  error,
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning" | "info";
  loading: boolean;
  error: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning"
          : tone === "info"
            ? "text-info"
            : "text-foreground";

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={`mt-2 truncate text-lg font-semibold tracking-tight ${toneClass}`}>
            {loading ? <LoadingValue small /> : error ? "—" : formatMoney(value)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} aria-hidden="true" />
      </CardContent>
    </Card>
  );
}

function BreakdownBar({
  label,
  value,
  total,
  color,
  loading,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  loading: boolean;
}) {
  const width = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{loading ? <LoadingValue small /> : formatMoney(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function ExposureRow({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  loading,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning" | "info";
  loading: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning"
          : tone === "info"
            ? "text-info"
            : "text-foreground";

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${toneClass}`} aria-hidden="true" />
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${toneClass}`}>
        {loading ? <LoadingValue small /> : formatMoney(value)}
      </span>
    </div>
  );
}

type FinanceScope = "latest" | "group" | "round-range" | "fiscal-year" | "all";

function fiscalYearOptions() {
  const now = new Date();
  const currentStartYear =
    now.getMonth() > 6 || (now.getMonth() === 6 && now.getDate() >= 8)
      ? now.getFullYear()
      : now.getFullYear() - 1;

  return Array.from({ length: 4 }, (_, index) => {
    const startYear = currentStartYear - index;
    return {
      value: `${startYear}-07-08`,
      label: `FY ${startYear}/${String(startYear + 1).slice(-2)} • ${displayDate(`${startYear}-07-08`)} - ${displayDate(`${startYear + 1}-07-07`)}`,
      date_from: `${startYear}-07-08`,
      date_to: `${startYear + 1}-07-07`,
    };
  });
}

export function FinanceDashboardPage() {
  const [summary, setSummary] = useState<FinanceDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<FinanceScope>("latest");
  const [rounds, setRounds] = useState<TravelRound[]>([]);
  const [groups, setGroups] = useState<TravelGroupListItem[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [roundFrom, setRoundFrom] = useState("");
  const [roundTo, setRoundTo] = useState("");
  const fiscalOptions = useMemo(() => fiscalYearOptions(), []);
  const [fiscalYear, setFiscalYear] = useState(fiscalOptions[0]?.value ?? "");
  const [filtersReady, setFiltersReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadReferences() {
      try {
        const [roundResult, groupResult] = await Promise.all([
          api.listTravelRounds({ page: 1, page_size: 100 }),
          api.listTravelGroups(1, 100),
        ]);
        if (!cancelled) {
          setRounds(roundResult.data);
          setGroups(groupResult.data);
          const latestActive = roundResult.data
            .filter((round) => round.status === "OPEN" || round.status === "PLANNING")
            .sort((a, b) => b.departure_date.localeCompare(a.departure_date))[0];
          setSelectedRoundId(latestActive?.id ?? "");
          setFiltersReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Finance filters could not be loaded");
          setFiltersReady(true);
        }
      }
    }
    void loadReferences();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!filtersReady) return;
    setLoading(true);
    setError(null);
    const filters =
      scope === "latest"
        ? { travel_round_id: selectedRoundId || undefined }
        : scope === "group"
          ? { travel_group_id: selectedGroupId || undefined }
          : scope === "round-range"
            ? {
                travel_round_from: roundFrom ? Number(roundFrom) : undefined,
                travel_round_to: roundTo ? Number(roundTo) : undefined,
              }
            : scope === "fiscal-year"
              ? fiscalOptions.find((option) => option.value === fiscalYear)
                ? {
                    date_from: fiscalOptions.find((option) => option.value === fiscalYear)
                      ?.date_from,
                    date_to: fiscalOptions.find((option) => option.value === fiscalYear)?.date_to,
                  }
                : {}
              : {};
    try {
      setSummary(await api.getFinanceDashboard(filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance dashboard");
    } finally {
      setLoading(false);
    }
  }, [
    filtersReady,
    scope,
    selectedRoundId,
    selectedGroupId,
    roundFrom,
    roundTo,
    fiscalYear,
    fiscalOptions,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const revenue = summary?.total_revenue ?? 0;
  const collected = summary?.total_collected ?? 0;
  const outstanding = summary?.outstanding ?? 0;
  const expenses = summary?.total_expenses ?? 0;
  const adjustments = summary?.total_adjustments ?? 0;
  const netExpenses = summary?.net_expenses ?? expenses;
  const refunds = summary?.total_refunds ?? 0;
  const profitLoss = summary?.profit_loss ?? 0;
  const collectionRate = revenue > 0 ? Math.round((collected / revenue) * 100) : 0;
  const profitPositive = profitLoss >= 0;
  const collectionTone =
    collectionRate <= 50 ? "destructive" : collectionRate <= 90 ? "warning" : "success";
  const collectionBar =
    collectionTone === "destructive"
      ? "bg-destructive"
      : collectionTone === "warning"
        ? "bg-warning"
        : "bg-success";
  const collectionText =
    collectionTone === "destructive"
      ? "text-destructive"
      : collectionTone === "warning"
        ? "text-warning"
        : "text-success";
  const costTotal = Math.max(Math.abs(netExpenses) + refunds, 1);

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Financial overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Finance dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            See the financial position first, then the costs and exposure behind it.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scope
            </p>
            <Select
              value={scope}
              onValueChange={(value) => setScope((value ?? "latest") as FinanceScope)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest active round</SelectItem>
                <SelectItem value="group">Travel group</SelectItem>
                <SelectItem value="round-range">Round range</SelectItem>
                <SelectItem value="fiscal-year">Fiscal year</SelectItem>
                <SelectItem value="all">All finance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "latest" && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active round
              </p>
              <Select
                value={selectedRoundId}
                onValueChange={(value) => setSelectedRoundId(value ?? "")}
                disabled={!rounds.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {rounds.find((round) => round.id === selectedRoundId)
                      ? `R${String(rounds.find((round) => round.id === selectedRoundId)!.round_number).padStart(2, "0")} — ${rounds.find((round) => round.id === selectedRoundId)!.name}`
                      : "Loading rounds…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rounds
                    .filter((round) => round.status === "OPEN" || round.status === "PLANNING")
                    .sort((a, b) => b.departure_date.localeCompare(a.departure_date))
                    .map((round) => (
                      <SelectItem key={round.id} value={round.id}>
                        Round {round.round_number} · {round.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "group" && (
            <div className="space-y-2 sm:col-span-1 lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Travel group
              </p>
              <Select
                value={selectedGroupId}
                onValueChange={(value) => setSelectedGroupId(value ?? "")}
                disabled={!groups.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {groups.find((group) => group.id === selectedGroupId)
                      ? `${groups.find((group) => group.id === selectedGroupId)!.group_number} — ${groups.find((group) => group.id === selectedGroupId)!.name}`
                      : "Select a travel group"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.group_number} · {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === "round-range" && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  From round
                </p>
                <Select
                  value={roundFrom}
                  onValueChange={(value) => setRoundFrom(value ?? "")}
                  disabled={!rounds.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{roundFrom ? `Round ${roundFrom}` : "Start"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rounds
                      .slice()
                      .sort((a, b) => a.round_number - b.round_number)
                      .map((round) => (
                        <SelectItem key={round.id} value={String(round.round_number)}>
                          Round {round.round_number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  To round
                </p>
                <Select
                  value={roundTo}
                  onValueChange={(value) => setRoundTo(value ?? "")}
                  disabled={!rounds.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{roundTo ? `Round ${roundTo}` : "End"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rounds
                      .slice()
                      .sort((a, b) => a.round_number - b.round_number)
                      .map((round) => (
                        <SelectItem key={round.id} value={String(round.round_number)}>
                          Round {round.round_number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {scope === "fiscal-year" && (
            <div className="space-y-2 sm:col-span-1 lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fiscal year
              </p>
              <Select value={fiscalYear} onValueChange={(value) => setFiscalYear(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {fiscalOptions.find((option) => option.value === fiscalYear)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fiscalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span className="text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
            Try again
          </Button>
        </div>
      )}

      <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
        <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">Net position</p>
              {!loading && !error && (
                <Badge variant={profitPositive ? "secondary" : "destructive"}>
                  {profitPositive ? "Positive" : "Needs attention"}
                </Badge>
              )}
            </div>
            <p
              className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${profitPositive ? "text-success" : "text-destructive"}`}
            >
              {loading ? <LoadingValue /> : error ? "—" : formatMoney(profitLoss)}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {loading
                ? "Calculating the current financial position…"
                : profitPositive
                  ? "Collections are currently ahead of costs and refunds."
                  : "Costs and refunds currently exceed collected cash."}
            </p>
          </div>
          <div className="rounded-lg border bg-background/80 p-4 lg:min-w-56">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Collection rate</span>
              <ArrowDownLeft className={`h-4 w-4 ${collectionText}`} aria-hidden="true" />
            </div>
            <p className={`mt-2 text-2xl font-semibold ${collectionText}`}>
              {loading ? <LoadingValue /> : error ? "—" : `${collectionRate}%`}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={`h-full rounded-full ${collectionBar} transition-all`}
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Collected versus invoiced revenue</p>
          </div>
        </CardContent>
      </Card>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Supporting financial metrics"
      >
        <MetricCard
          label="Revenue"
          value={revenue}
          description="All non-cancelled invoices"
          icon={CircleDollarSign}
          tone="info"
          loading={loading}
          error={Boolean(error)}
        />
        <MetricCard
          label="Collected"
          value={collected}
          description="Allocated customer payments"
          icon={ArrowDownLeft}
          tone="positive"
          loading={loading}
          error={Boolean(error)}
        />
        <MetricCard
          label="Outstanding"
          value={outstanding}
          description="Open customer balance"
          icon={WalletCards}
          tone="negative"
          loading={loading}
          error={Boolean(error)}
        />
        <MetricCard
          label="Net expenses"
          value={netExpenses}
          description="Expenses after adjustments"
          icon={ReceiptText}
          tone="warning"
          loading={loading}
          error={Boolean(error)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Cash position</CardTitle>
            <CardDescription>
              How invoiced revenue is split between collected and outstanding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className="flex h-4 overflow-hidden rounded-full bg-muted"
              aria-label={`Collection rate ${collectionRate}%`}
            >
              <div
                className="bg-success transition-all"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
              <div
                className="bg-warning transition-all"
                style={{ width: `${Math.max(0, 100 - collectionRate)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                Collected
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Outstanding
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <BreakdownBar
                label="Collected"
                value={collected}
                total={revenue}
                color="bg-success"
                loading={loading}
              />
              <BreakdownBar
                label="Outstanding"
                value={outstanding}
                total={revenue}
                color="bg-warning"
                loading={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial exposure</CardTitle>
            <CardDescription>Amounts requiring attention or follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <ExposureRow
              label="Outstanding balance"
              value={outstanding}
              icon={WalletCards}
              tone="negative"
              loading={loading}
            />
            <ExposureRow
              label="Authorized credit"
              value={summary?.authorized_credit ?? 0}
              icon={ShieldCheck}
              tone="warning"
              loading={loading}
            />
            <ExposureRow
              label="Refunds issued"
              value={refunds}
              icon={RotateCcw}
              tone="negative"
              loading={loading}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost drivers</CardTitle>
            <CardDescription>What is shaping the current profit/loss result.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <BreakdownBar
              label="Net expenses"
              value={Math.abs(netExpenses)}
              total={costTotal}
              color="bg-primary"
              loading={loading}
            />
            <BreakdownBar
              label="Adjustments"
              value={Math.abs(adjustments)}
              total={costTotal}
              color="bg-info"
              loading={loading}
            />
            <BreakdownBar
              label="Refunds"
              value={refunds}
              total={costTotal}
              color="bg-destructive"
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result summary</CardTitle>
            <CardDescription>A concise bridge from collected cash to net position.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <ExposureRow
              label="Cash collected"
              value={collected}
              icon={ArrowDownLeft}
              tone="positive"
              loading={loading}
            />
            <ExposureRow
              label="Net expenses"
              value={netExpenses}
              icon={ReceiptText}
              tone="warning"
              loading={loading}
            />
            <ExposureRow
              label="Profit / loss"
              value={profitLoss}
              icon={profitPositive ? TrendingUp : TrendingDown}
              tone={profitPositive ? "positive" : "negative"}
              loading={loading}
            />
          </CardContent>
        </Card>
      </section>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Figures are calculated from current invoices, payments, expenses, adjustments, refunds, and
        authorized credit records.
      </p>
    </div>
  );
}
