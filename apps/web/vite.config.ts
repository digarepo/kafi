import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      conditions: ['development'],
      alias: {
        '@': path.resolve(__dirname, './app'),
        '@ui': path.resolve(__dirname, '../../packages/ui/src'),
        '@kafi/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string): string | undefined {
            // Bundle all Phosphor icons into a single chunk instead of
            // 12+ separate 1-3KB requests that cause waterfall latency.
            if (id.includes('node_modules/@phosphor-icons')) {
              return 'icons';
            }
            // Keep Zod in its own chunk so it can be lazy-loaded away
            // from the initial page bundle by code that only needs it
            // on interaction (forms, validation).
            if (id.includes('node_modules/zod')) {
              return 'schemas';
            }
            return undefined;
          },
        },
      },
    },
  };
});
