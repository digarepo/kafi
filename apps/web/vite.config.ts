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
    ssr: {
      noExternal: ['@kafi/ui'],
    },
  };
});
