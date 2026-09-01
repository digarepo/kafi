import { lazy, Suspense, useEffect } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from 'react-router';
import type { Route } from './+types/root';

import './app.css';
import { ThemeProvider } from '@ui/providers/theme-provider';
import { UIConfigProvider } from '@ui/providers/ui-config-provider';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { captureAttribution } from './lib/attribution';
import { trackPageView } from './lib/analytics';

// Lazy-load the Sonner Toaster so the toast library (~31KB) is not part of
// the initial bundle on every page. It loads after hydration and is ready
// before any user-triggered toast (form submissions, etc.).
const Toaster = lazy(() =>
  import('@ui/components/ui/sonner').then((m) => ({ default: m.Toaster })),
);

// Lazy-load the mobile menu so the Sheet component (and its @base-ui/react
// dialog dependency) is not part of the initial bundle on every page.
const MobileBottomNav = lazy(() =>
  import('./components/layout/MobileMenu').then((m) => ({
    default: m.MobileBottomNav,
  })),
);

// Default meta as a safety net. Route-level meta() functions override these.
// This prevents any route from accidentally rendering without a title.
export function meta() {
  return [
    { title: 'Kafi Tours — Umrah Travel Packages from Ethiopia' },
    {
      name: 'description',
      content:
        'Kafi Tours arranges Umrah travel packages from Addis Ababa to Makkah and Madinah. Ethiopian Airlines flights, visa assistance, hotel accommodation, and group guidance.',
    },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />

        {/* Preconnect to the API to reduce connection setup latency */}
        <link rel="preconnect" href={import.meta.env.VITE_API_URL} />
        <link rel="dns-prefetch" href={import.meta.env.VITE_API_URL} />

        {/* Preload critical font weights — body text, bold, and headings.
            All three are used above the fold on every page. */}
        <link
          rel="preload"
          href="/fonts/inter-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/inter-700.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/montserrat-700.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

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

        {/* Google Analytics 4 — loaded once when VITE_GA4_MEASUREMENT_ID is set.
            The gtag script tracks the initial pageview automatically. Client-side
            navigations are tracked via trackPageView() in the App component. */}
        {import.meta.env.VITE_GA4_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA4_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${import.meta.env.VITE_GA4_MEASUREMENT_ID}');`,
              }}
            />
          </>
        )}
      </head>
      <body>
        <UIConfigProvider style="nova">
          <ThemeProvider defaultTheme="system">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-elevated focus:border focus:border-border"
            >
              Skip to content
            </a>
            <Navbar />
            {children}
            <Suspense fallback={null}>
              <Toaster richColors position="top-right" duration={3000} />
            </Suspense>
            <Footer />
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
          </ThemeProvider>
        </UIConfigProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();

  // Capture UTM/source attribution on the client on initial load only.
  // Internal navigations do not overwrite the original campaign —
  // captureAttribution() only writes when UTM params are present in the URL.
  useEffect(() => {
    captureAttribution();
  }, []);

  // Track client-side navigations in GA4. The initial page load is tracked
  // automatically by the gtag config script. This effect fires only on
  // subsequent client-side route changes, so no double-counting occurs.
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

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
