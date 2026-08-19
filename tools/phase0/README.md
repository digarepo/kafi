# Phase 0 Benchmark Tooling

These tools are for isolated local/staging measurement only. They do not change application business behavior.

## Environment

Required benchmark credentials are supplied only through environment variables:

```bash
export KAFI_BENCHMARK_EMAIL=...
export KAFI_BENCHMARK_PASSWORD=...
```

Never commit credentials or include tokens in reports.

## Migration verification

```bash
npm run phase0:migrations
```

Optional database target:

```bash
KAFI_MIGRATION_DATABASE=kafi_phase0_bench_20260818 npm run phase0:migrations
```

The command is read-only and exits non-zero when migration files, the journal, or applied state show drift.

## Benchmark fixtures

The fixture runner refuses normal development/test database names and requires an explicit destructive reset flag.

Preferred migration-backed setup:

```bash
KAFI_BENCHMARK_DATABASE=kafi_phase0_bench_small \
  npm run phase0:fixtures -- small --reset --migrate --seed
```

Tiers:

```text
small   50 travellers / 100 registrations / 10 groups
medium  500 travellers / 1000 registrations / 50 groups
large   5000 travellers / 10000 registrations / 250 groups
```

The fixture includes package versions, memberships, documents, visas, flights, invoices, payments/allocations, expenses, hotel stays, rooms/assignments, and transport.

Current migration/journal drift prevents the migration-backed path from being considered verified. An explicit schema-copy fallback is available for isolated benchmark data only:

```bash
KAFI_BENCHMARK_DATABASE=kafi_phase0_bench_small \
KAFI_BENCHMARK_SCHEMA_SOURCE_DATABASE=kafi_dev \
  npm run phase0:fixtures -- small --reset --seed
```

Schema-copy mode is clearly recorded in the metadata output and is not migration verification. It must not be used as a reason to bypass production migration reconciliation.

Fixture metadata is written under `tmp/phase0-fixtures/`.

## Browser benchmark

Build and start the production Admin/API separately. The Admin build must contain the API URL for the target API.

```bash
KAFI_ADMIN_URL=http://localhost:3000 \
KAFI_BENCHMARK_EMAIL=... \
KAFI_BENCHMARK_PASSWORD=... \
KAFI_BENCHMARK_FIXTURE_TIER=small \
  npm -w @kafi/admin run perf:browser
```

The harness uses one Playwright/Chromium stack and supports desktop/mobile projects, cold/warm route traces, authenticated navigation, console errors, API/resource records, duplicate grouping, and browser timing metrics.

Routes can be overridden:

```bash
KAFI_BENCHMARK_ROUTES='/,/finance/dashboard,/registrations,/travel-groups'
```

Reports are written under `tmp/phase0-browser/`.

## Lighthouse benchmark

The authenticated Lighthouse wrapper uses the same Chromium profile through the Playwright-launched remote debugging port:

```bash
KAFI_ADMIN_URL=http://localhost:3000 \
KAFI_BENCHMARK_EMAIL=... \
KAFI_BENCHMARK_PASSWORD=... \
KAFI_LIGHTHOUSE_ROUTE=/registrations \
KAFI_LIGHTHOUSE_FORM_FACTOR=mobile \
  npm -w @kafi/admin run perf:lighthouse
```

For the explicit production-like mobile profile, add:

```bash
KAFI_LIGHTHOUSE_THROTTLED=true \
KAFI_LIGHTHOUSE_FORM_FACTOR=mobile \
  npm -w @kafi/admin run perf:lighthouse
```

This uses Lighthouse simulated mobile conditions of 150 ms RTT, 1638.4 Kbps throughput, and 4x CPU slowdown. Supported form factors are `mobile` and `desktop`. Reports include Lighthouse performance score, FCP, LCP, TBT, CLS, Speed Index, interactive, server response time, and resource summary.

## Concurrency benchmark

```bash
KAFI_API_URL=http://localhost:4000 \
KAFI_BENCHMARK_EMAIL=... \
KAFI_BENCHMARK_PASSWORD=... \
KAFI_BENCHMARK_FIXTURE_TIER=small \
KAFI_CONCURRENCY=10 \
KAFI_CONCURRENCY_DURATION_SECONDS=10 \
  npm run phase0:concurrency
```

The harness reports attempted/successful/failed requests, error rate, throughput, p50/p95/p99/max, response bytes, and status distribution. Run 50/100 only in a safe isolated environment. Do not run 500/1000 without explicit staging approval.

Reports are written under `tmp/phase0-concurrency/`.

## Post-deploy smoke

```bash
KAFI_SMOKE_API_URL=https://api.example \
KAFI_SMOKE_ADMIN_URL=https://admin.example \
  npm run phase0:smoke
```

For authenticated smoke, configure `KAFI_SMOKE_EMAIL`, `KAFI_SMOKE_PASSWORD`, and `KAFI_SMOKE_REQUIRE_AUTH=true`. The command never prints credentials or response bodies.

Checks include:

- API liveness;
- API readiness;
- Admin document;
- one generated static asset;
- optional authenticated `/api/auth/me` smoke.

## Phase 3 mutation regression

Run only against a dedicated isolated fixture database. The test creates a uniquely named package template and archives it through an authenticated cleanup request; it does not reset or mutate normal development data.

```bash
KAFI_ADMIN_URL=http://localhost:3000 \
KAFI_API_URL=http://localhost:4000 \
KAFI_BENCHMARK_EMAIL=... \
KAFI_BENCHMARK_PASSWORD=... \
KAFI_MUTATION_REGRESSION=true \
  npm -w @kafi/admin run perf:mutation
```

If the test fails after creating a record, rerun the isolated fixture reset before another attempt.
