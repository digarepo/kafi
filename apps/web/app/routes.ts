import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  layout('routes/site-layout.tsx', [
    index('routes/home.tsx'),
    route('packages', 'routes/packages.tsx'),
    route('packages/:slug', 'routes/package-detail.tsx'),

    route('services', 'routes/services.tsx'),
    route('services/:slug', 'routes/service-detail.tsx'),

    route('contact', 'routes/contact.tsx'),

    route('booking', 'routes/booking.tsx'),
    route('callback', 'routes/callback.tsx'),
    route('enquiry', 'routes/enquiry.tsx'),

    route('about', 'routes/about.tsx'),

    route('faq', 'routes/faq.tsx'),
    route('links', 'routes/links.tsx'),

    route('*', 'not-found.tsx'),
  ]),

  // Legal pages render bare — no site chrome.
  route('privacy', 'routes/privacy.tsx'),
  route('tos', 'routes/tos.tsx'),

  // Resource routes (no component — loader returns non-HTML response)
  route('sitemap.xml', 'routes/sitemap.tsx'),
] satisfies RouteConfig;
