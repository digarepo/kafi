import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const MobileBottomNav = lazy(() =>
  import('@/components/layout/MobileMenu').then((m) => ({
    default: m.MobileBottomNav,
  })),
);

const ContactFab = lazy(() =>
  import('@/components/layout/ContactFab').then((m) => ({
    default: m.ContactFab,
  })),
);

/**
 * Marketing layout — wraps every public-facing page with the site chrome
 * (navbar, footer, mobile nav, contact FAB). Legal routes (privacy, ToS) sit
 * outside this layout in routes.ts so they render bare.
 */
export default function SiteLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <ContactFab />
      </Suspense>
    </>
  );
}
