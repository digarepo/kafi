import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    conditions: ['development'],
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@kafi/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  test: {
    include: ['app/**/*.spec.ts', 'app/**/*.spec.tsx'],
    environment: 'jsdom',
    globals: false,
  },
});
