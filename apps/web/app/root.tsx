import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { Route } from './+types/root';

import './app.css';
import {
  ThemeProvider,
  Toaster,
  TooltipProvider,
  UIConfigProvider,
} from '@kafi/ui';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileMenu';
import { Footer } from './components/layout/Footer';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />

        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="Kafi" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <UIConfigProvider style="nova">
          <ThemeProvider defaultTheme="system">
            <TooltipProvider>
              <Navbar />
              {children}
              <Toaster />
              <Footer />
              <MobileBottomNav />
            </TooltipProvider>
          </ThemeProvider>
        </UIConfigProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (import.meta.env.DEV) {
    console.error(error);
    if (error instanceof Error) {
      details = error.message;
      stack = error.stack;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-4xl font-bold text-foreground">{message}</h1>
        <p className="text-muted-foreground">{details}</p>
        {stack && (
          <pre className="text-left text-xs bg-muted p-4 rounded-lg overflow-auto max-h-48">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
