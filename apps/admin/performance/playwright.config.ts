import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.KAFI_ADMIN_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: Number(process.env.KAFI_BENCHMARK_TIMEOUT_MS ?? 120_000),
  fullyParallel: false,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],
});
